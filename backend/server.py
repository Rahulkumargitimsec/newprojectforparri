from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import xgboost as xgb
import joblib
import json
import io
import random
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Embedding, LSTM, Dense, Dropout
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
import pickle

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models Directory
MODELS_DIR = ROOT_DIR / 'models'
MODELS_DIR.mkdir(exist_ok=True)

# ============ Pydantic Models ============

class Session(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    timestamp: str
    page: str
    action: str
    device: str
    session_id: str
    duration: int
    purchase: int = 0

class TrainingJob(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "pending"  # pending, training, completed, failed
    model_type: str
    features: List[str]
    metrics: Optional[Dict[str, float]] = None
    model_path: Optional[str] = None
    error: Optional[str] = None

class SimulatedUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_type: str
    sessions_count: int
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TrainingRequest(BaseModel):
    model_type: str
    features: List[str]
    test_size: float = 0.2

class SimulatorRequest(BaseModel):
    user_type: str
    num_sessions: int = 50

# ============ Helper Functions ============

def generate_synthetic_sessions(user_type: str, num_sessions: int = 50) -> List[Dict[str, Any]]:
    """Generate synthetic web sessions based on user type"""
    sessions = []
    pages = ['home', 'product', 'cart', 'checkout', 'about', 'contact']
    actions = ['view', 'click', 'scroll', 'add_to_cart', 'purchase']
    devices = ['mobile', 'desktop', 'tablet']
    
    user_id = str(uuid.uuid4())
    session_id = str(uuid.uuid4())
    
    for i in range(num_sessions):
        if i % 10 == 0:
            session_id = str(uuid.uuid4())
        
        if user_type == 'fast_buyer':
            page = random.choices(pages, weights=[10, 30, 25, 35, 0, 0])[0]
            action = random.choices(actions, weights=[10, 20, 5, 30, 35])[0]
            duration = random.randint(10, 60)
            purchase = 1 if action == 'purchase' else 0
        elif user_type == 'window_shopper':
            page = random.choices(pages, weights=[20, 50, 10, 5, 10, 5])[0]
            action = random.choices(actions, weights=[50, 30, 15, 4, 1])[0]
            duration = random.randint(30, 180)
            purchase = 1 if action == 'purchase' and random.random() < 0.05 else 0
        elif user_type == 'hesitant_user':
            page = random.choices(pages, weights=[15, 35, 30, 15, 3, 2])[0]
            action = random.choices(actions, weights=[40, 30, 20, 8, 2])[0]
            duration = random.randint(60, 240)
            purchase = 1 if action == 'purchase' and random.random() < 0.1 else 0
        elif user_type == 'bargain_hunter':
            page = random.choices(pages, weights=[10, 45, 20, 20, 3, 2])[0]
            action = random.choices(actions, weights=[45, 25, 15, 10, 5])[0]
            duration = random.randint(40, 200)
            purchase = 1 if action == 'purchase' and random.random() < 0.15 else 0
        else:  # churn_user
            page = random.choices(pages, weights=[70, 20, 5, 2, 2, 1])[0]
            action = random.choices(actions, weights=[70, 20, 9, 1, 0])[0]
            duration = random.randint(5, 30)
            purchase = 0
        
        session = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'timestamp': (datetime.now(timezone.utc) - timedelta(minutes=random.randint(0, 10000))).isoformat(),
            'page': page,
            'action': action,
            'device': random.choice(devices),
            'session_id': session_id,
            'duration': duration,
            'purchase': purchase
        }
        sessions.append(session)
    
    return sessions

def preprocess_data(df: pd.DataFrame) -> tuple:
    """Preprocess data for ML models"""
    # Create a copy
    data = df.copy()
    
    # Encode categorical variables
    le_page = LabelEncoder()
    le_action = LabelEncoder()
    le_device = LabelEncoder()
    
    data['page_encoded'] = le_page.fit_transform(data['page'])
    data['action_encoded'] = le_action.fit_transform(data['action'])
    data['device_encoded'] = le_device.fit_transform(data['device'])
    
    # Session features
    session_features = data.groupby('session_id').agg({
        'duration': ['sum', 'mean', 'count'],
        'page_encoded': ['nunique'],
        'action_encoded': ['nunique'],
        'purchase': 'max'
    }).reset_index()
    
    session_features.columns = ['session_id', 'total_duration', 'avg_duration', 
                                'num_actions', 'unique_pages', 'unique_actions', 'purchase']
    
    return session_features, (le_page, le_action, le_device)

def train_model(model_type: str, X_train, X_test, y_train, y_test) -> tuple:
    """Train ML model and return model + metrics"""
    if model_type == 'logistic_regression':
        model = LogisticRegression(max_iter=1000, random_state=42)
    elif model_type == 'random_forest':
        model = RandomForestClassifier(n_estimators=100, random_state=42)
    elif model_type == 'xgboost':
        model = xgb.XGBClassifier(n_estimators=100, random_state=42, eval_metric='logloss')
    else:
        raise ValueError(f"Unknown model type: {model_type}")
    
    # Train
    model.fit(X_train, y_train)
    
    # Predict
    y_pred = model.predict(X_test)
    
    # Calculate metrics
    metrics = {
        'accuracy': float(accuracy_score(y_test, y_pred)),
        'precision': float(precision_score(y_test, y_pred, zero_division=0)),
        'recall': float(recall_score(y_test, y_pred, zero_division=0)),
        'f1_score': float(f1_score(y_test, y_pred, zero_division=0))
    }
    
    return model, metrics

def prepare_sequence_data(df: pd.DataFrame, max_sequence_length: int = 10) -> tuple:
    """Prepare sequence data for LSTM training"""
    # Sort by timestamp within each session
    df_sorted = df.sort_values(['session_id', 'timestamp'])
    
    # Create sequences of pages for each session
    sequences = []
    labels = []
    
    # Group by session
    for session_id, group in df_sorted.groupby('session_id'):
        # Get page sequence
        page_sequence = group['page'].tolist()
        # Get purchase label (1 if any purchase in session)
        purchase_label = int(group['purchase'].max() > 0)
        
        sequences.append(page_sequence)
        labels.append(purchase_label)
    
    # Tokenize sequences
    tokenizer = Tokenizer(oov_token='<OOV>')
    tokenizer.fit_on_texts(sequences)
    
    # Convert to sequences
    sequences_encoded = tokenizer.texts_to_sequences(sequences)
    
    # Pad sequences
    padded_sequences = pad_sequences(
        sequences_encoded, 
        maxlen=max_sequence_length, 
        padding='post',
        truncating='post'
    )
    
    return padded_sequences, np.array(labels), tokenizer

def build_lstm_model(vocab_size: int, embedding_dim: int = 32, max_sequence_length: int = 10) -> keras.Model:
    """Build LSTM model architecture"""
    model = Sequential([
        Embedding(vocab_size + 1, embedding_dim, input_length=max_sequence_length),
        LSTM(64, return_sequences=False),
        Dropout(0.3),
        Dense(32, activation='relu'),
        Dropout(0.2),
        Dense(1, activation='sigmoid')
    ])
    
    model.compile(
        optimizer='adam',
        loss='binary_crossentropy',
        metrics=['accuracy', keras.metrics.Precision(), keras.metrics.Recall()]
    )
    
    return model

def train_lstm_model(X_train, X_test, y_train, y_test, vocab_size: int, max_sequence_length: int = 10) -> tuple:
    """Train LSTM model and return model + metrics"""
    # Build model
    model = build_lstm_model(vocab_size, embedding_dim=32, max_sequence_length=max_sequence_length)
    
    # Train
    history = model.fit(
        X_train, y_train,
        epochs=20,
        batch_size=32,
        validation_split=0.2,
        verbose=0
    )
    
    # Predict
    y_pred_prob = model.predict(X_test, verbose=0)
    y_pred = (y_pred_prob > 0.5).astype(int).flatten()
    
    # Calculate metrics
    metrics = {
        'accuracy': float(accuracy_score(y_test, y_pred)),
        'precision': float(precision_score(y_test, y_pred, zero_division=0)),
        'recall': float(recall_score(y_test, y_pred, zero_division=0)),
        'f1_score': float(f1_score(y_test, y_pred, zero_division=0))
    }
    
    return model, metrics

# ============ API Routes ============

@api_router.get("/")
async def root():
    return {"message": "Customer Behaviour Prediction API", "version": "1.0.0"}

# Dashboard APIs
@api_router.get("/analytics/overview")
async def get_analytics_overview():
    """Get overall analytics overview"""
    sessions = await db.sessions.find({}, {"_id": 0}).to_list(10000)
    
    if not sessions:
        return {
            "total_sessions": 0,
            "total_users": 0,
            "total_purchases": 0,
            "conversion_rate": 0,
            "avg_session_duration": 0
        }
    
    df = pd.DataFrame(sessions)
    
    total_sessions = len(df['session_id'].unique())
    total_users = len(df['user_id'].unique())
    total_purchases = df['purchase'].sum()
    # Calculate conversion rate as percentage of sessions that resulted in purchase
    sessions_with_purchase = df[df['purchase'] > 0]['session_id'].nunique()
    conversion_rate = (sessions_with_purchase / total_sessions * 100) if total_sessions > 0 else 0
    avg_duration = df['duration'].mean()
    
    return {
        "total_sessions": int(total_sessions),
        "total_users": int(total_users),
        "total_purchases": int(total_purchases),
        "conversion_rate": round(conversion_rate, 2),
        "avg_session_duration": round(avg_duration, 2)
    }

@api_router.get("/analytics/click-distribution")
async def get_click_distribution():
    """Get click distribution by action"""
    sessions = await db.sessions.find({}, {"_id": 0}).to_list(10000)
    
    if not sessions:
        return []
    
    df = pd.DataFrame(sessions)
    distribution = df['action'].value_counts().to_dict()
    
    return [{"name": k, "value": int(v)} for k, v in distribution.items()]

@api_router.get("/analytics/page-heatmap")
async def get_page_heatmap():
    """Get page visit heatmap"""
    sessions = await db.sessions.find({}, {"_id": 0}).to_list(10000)
    
    if not sessions:
        return []
    
    df = pd.DataFrame(sessions)
    heatmap = df.groupby(['page', 'device']).size().reset_index(name='visits')
    
    return heatmap.to_dict('records')

@api_router.get("/analytics/funnel")
async def get_funnel_data():
    """Get conversion funnel data"""
    sessions = await db.sessions.find({}, {"_id": 0}).to_list(10000)
    
    if not sessions:
        return []
    
    df = pd.DataFrame(sessions)
    
    # Group by session
    session_groups = df.groupby('session_id')['page'].apply(set)
    
    home_visits = sum(1 for pages in session_groups if 'home' in pages)
    product_visits = sum(1 for pages in session_groups if 'product' in pages)
    cart_visits = sum(1 for pages in session_groups if 'cart' in pages)
    checkout_visits = sum(1 for pages in session_groups if 'checkout' in pages)
    purchases = df[df['purchase'] == 1]['session_id'].nunique()
    
    return [
        {"stage": "Home", "count": home_visits},
        {"stage": "Product", "count": product_visits},
        {"stage": "Cart", "count": cart_visits},
        {"stage": "Checkout", "count": checkout_visits},
        {"stage": "Purchase", "count": purchases}
    ]

@api_router.get("/analytics/device-breakdown")
async def get_device_breakdown():
    """Get sessions by device type"""
    sessions = await db.sessions.find({}, {"_id": 0}).to_list(10000)
    
    if not sessions:
        return []
    
    df = pd.DataFrame(sessions)
    device_counts = df.groupby('device')['session_id'].nunique().to_dict()
    
    return [{"name": k, "value": int(v)} for k, v in device_counts.items()]

# Training APIs
@api_router.post("/training/upload")
async def upload_training_data(file: UploadFile = File(...)):
    """Upload CSV data for training"""
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # Validate required columns
        required_cols = ['page', 'action', 'device', 'session_id', 'duration', 'purchase']
        missing_cols = [col for col in required_cols if col not in df.columns]
        
        if missing_cols:
            raise HTTPException(status_code=400, detail=f"Missing columns: {missing_cols}")
        
        # Store in database
        records = df.to_dict('records')
        for record in records:
            if 'id' not in record:
                record['id'] = str(uuid.uuid4())
            if 'timestamp' not in record:
                record['timestamp'] = datetime.now(timezone.utc).isoformat()
            if 'user_id' not in record:
                record['user_id'] = str(uuid.uuid4())
        
        await db.sessions.insert_many(records)
        
        return {
            "message": "Data uploaded successfully",
            "rows": len(records),
            "columns": list(df.columns)
        }
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/training/features")
async def get_available_features():
    """Get available features for training"""
    return {
        "features": [
            "total_duration",
            "avg_duration",
            "num_actions",
            "unique_pages",
            "unique_actions"
        ]
    }

@api_router.post("/training/train", response_model=TrainingJob)
async def start_training(request: TrainingRequest, background_tasks: BackgroundTasks):
    """Start model training"""
    # Create training job
    job = TrainingJob(
        model_type=request.model_type,
        features=request.features,
        status="training"
    )
    
    job_dict = job.model_dump()
    await db.training_jobs.insert_one(job_dict)
    
    # Start training in background
    background_tasks.add_task(train_model_task, job.id, request)
    
    return job

async def train_model_task(job_id: str, request: TrainingRequest):
    """Background task for model training"""
    try:
        # Get sessions data
        sessions = await db.sessions.find({}, {"_id": 0}).to_list(10000)
        
        if not sessions:
            raise ValueError("No training data available")
        
        df = pd.DataFrame(sessions)
        
        # Check if LSTM model
        if request.model_type == 'lstm':
            # Prepare sequence data for LSTM
            X_sequences, y, tokenizer = prepare_sequence_data(df, max_sequence_length=10)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X_sequences, y, test_size=request.test_size, random_state=42
            )
            
            # Get vocab size
            vocab_size = len(tokenizer.word_index)
            
            # Train LSTM model
            model, metrics = train_lstm_model(
                X_train, X_test, y_train, y_test, 
                vocab_size=vocab_size, 
                max_sequence_length=10
            )
            
            # Save LSTM model
            model_filename = f"{job_id}_lstm.h5"
            tokenizer_filename = f"{job_id}_tokenizer.pkl"
            model_path = MODELS_DIR / model_filename
            tokenizer_path = MODELS_DIR / tokenizer_filename
            
            model.save(str(model_path))
            with open(tokenizer_path, 'wb') as f:
                pickle.dump(tokenizer, f)
            
            # Update job
            await db.training_jobs.update_one(
                {"id": job_id},
                {"$set": {
                    "status": "completed",
                    "metrics": metrics,
                    "model_path": str(model_path)
                }}
            )
        else:
            # Traditional ML models
            # Preprocess
            session_features, encoders = preprocess_data(df)
            
            # Select features
            X = session_features[request.features]
            y = session_features['purchase']
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=request.test_size, random_state=42
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train model
            model, metrics = train_model(request.model_type, X_train_scaled, X_test_scaled, y_train, y_test)
            
            # Save model
            model_filename = f"{job_id}_{request.model_type}.joblib"
            model_path = MODELS_DIR / model_filename
            joblib.dump({
                'model': model,
                'scaler': scaler,
                'encoders': encoders,
                'features': request.features
            }, model_path)
            
            # Update job
            await db.training_jobs.update_one(
                {"id": job_id},
                {"$set": {
                    "status": "completed",
                    "metrics": metrics,
                    "model_path": str(model_path)
                }}
            )
        
    except Exception as e:
        logger.error(f"Training error: {str(e)}")
        await db.training_jobs.update_one(
            {"id": job_id},
            {"$set": {
                "status": "failed",
                "error": str(e)
            }}
        )

@api_router.get("/training/jobs", response_model=List[TrainingJob])
async def get_training_jobs():
    """Get all training jobs"""
    jobs = await db.training_jobs.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return jobs

@api_router.get("/training/job/{job_id}", response_model=TrainingJob)
async def get_training_job(job_id: str):
    """Get specific training job"""
    job = await db.training_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@api_router.get("/training/download/{job_id}")
async def download_model(job_id: str):
    """Download trained model"""
    job = await db.training_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job.get('model_path'):
        raise HTTPException(status_code=404, detail="Model not found")
    
    model_path = Path(job['model_path'])
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Model file not found")
    
    return FileResponse(
        path=model_path,
        filename=model_path.name,
        media_type='application/octet-stream'
    )

# Simulator APIs
@api_router.post("/simulator/generate")
async def generate_user_behavior(request: SimulatorRequest):
    """Generate synthetic user behavior"""
    try:
        sessions = generate_synthetic_sessions(request.user_type, request.num_sessions)
        
        # Create sample before storing (to avoid _id contamination)
        sample_sessions = [dict(s) for s in sessions[:5]]
        
        # Store sessions
        await db.sessions.insert_many(sessions)
        
        # Store simulated user
        user = SimulatedUser(
            user_type=request.user_type,
            sessions_count=request.num_sessions
        )
        await db.simulated_users.insert_one(user.model_dump())
        
        return {
            "message": "User behavior generated successfully",
            "user_type": request.user_type,
            "sessions_generated": request.num_sessions,
            "sample_sessions": sample_sessions
        }
    except Exception as e:
        logger.error(f"Simulator error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/simulator/users")
async def get_simulated_users():
    """Get all simulated users"""
    users = await db.simulated_users.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return users

@api_router.get("/simulator/user-types")
async def get_user_types():
    """Get available user types for simulation"""
    return {
        "user_types": [
            {
                "id": "fast_buyer",
                "name": "Fast Buyer",
                "description": "Quick decision makers who convert rapidly"
            },
            {
                "id": "window_shopper",
                "name": "Window Shopper",
                "description": "Browsers who rarely purchase"
            },
            {
                "id": "hesitant_user",
                "name": "Hesitant User",
                "description": "Users who take time to decide"
            },
            {
                "id": "bargain_hunter",
                "name": "Bargain Hunter",
                "description": "Users looking for best deals"
            },
            {
                "id": "churn_user",
                "name": "Churn User",
                "description": "Users who leave quickly without engaging"
            }
        ]
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
