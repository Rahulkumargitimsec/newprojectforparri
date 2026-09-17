import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Upload, Play, Download, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Training = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState(null);
  const [selectedModel, setSelectedModel] = useState("logistic_regression");
  const [selectedFeatures, setSelectedFeatures] = useState([
    "total_duration",
    "avg_duration",
    "num_actions",
  ]);
  const [trainingJobs, setTrainingJobs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [training, setTraining] = useState(false);

  const availableFeatures = [
    "total_duration",
    "avg_duration",
    "num_actions",
    "unique_pages",
    "unique_actions",
  ];

  const modelTypes = [
    {
      id: "logistic_regression",
      name: "Logistic Regression",
      description: "Fast, interpretable binary classification",
      type: "traditional"
    },
    {
      id: "random_forest",
      name: "Random Forest",
      description: "Ensemble method with high accuracy",
      type: "traditional"
    },
    {
      id: "xgboost",
      name: "XGBoost",
      description: "Gradient boosting with superior performance",
      type: "traditional"
    },
    {
      id: "lstm",
      name: "LSTM (Deep Learning)",
      description: "Recurrent neural network for sequential patterns",
      type: "deep_learning"
    },
  ];

  useEffect(() => {
    fetchTrainingJobs();
    const interval = setInterval(fetchTrainingJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchTrainingJobs = async () => {
    try {
      const response = await axios.get(`${API}/training/jobs`);
      setTrainingJobs(response.data);
    } catch (error) {
      console.error("Failed to fetch training jobs:", error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith(".csv")) {
      setFile(selectedFile);
      toast.success("File selected: " + selectedFile.name);
    } else {
      toast.error("Please select a CSV file");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(`${API}/training/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(`Uploaded ${response.data.rows} rows successfully`);
      setCurrentStep(2);
    } catch (error) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleTrain = async () => {
    try {
      setTraining(true);
      const response = await axios.post(`${API}/training/train`, {
        model_type: selectedModel,
        features: selectedFeatures,
        test_size: 0.2,
      });

      toast.success("Training started! Check the results below.");
      setCurrentStep(3);
      fetchTrainingJobs();
    } catch (error) {
      toast.error("Training failed: " + error.message);
    } finally {
      setTraining(false);
    }
  };

  const handleDownload = async (jobId) => {
    try {
      const response = await axios.get(`${API}/training/download/${jobId}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `model_${jobId}.joblib`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Model downloaded successfully");
    } catch (error) {
      toast.error("Download failed: " + error.message);
    }
  };

  const toggleFeature = (feature) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const steps = [
    { number: 1, title: "Upload Data", description: "Import training dataset" },
    { number: 2, title: "Configure", description: "Select model & features" },
    { number: 3, title: "Train & Results", description: "View metrics" },
  ];

  return (
    <div className="min-h-screen bg-background grid-background" data-testid="training-page">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
            Model Training
          </h1>
          <p className="text-base text-muted-foreground">
            Train machine learning models on customer behavior data
          </p>
        </motion.div>

        {/* Stepper */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="bg-card border border-border/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={step.number} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                          currentStep >= step.number
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {currentStep > step.number ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          step.number
                        )}
                      </div>
                      <div className="text-center mt-2">
                        <p className="text-sm font-medium">{step.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-4 transition-all ${
                          currentStep > step.number
                            ? "bg-primary"
                            : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Training Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Upload */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  data-testid="upload-section"
                  className="bg-card border border-border/60"
                >
                  <CardHeader className="p-6 border-b border-border/40 bg-muted/20">
                    <CardTitle className="text-2xl font-semibold tracking-tight">
                      Upload Training Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-border/60 rounded-lg p-12 text-center hover:border-primary/40 transition-colors">
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">
                          Choose a CSV file
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Required columns: page, action, device, session_id,
                          duration, purchase
                        </p>
                        <input
                          data-testid="file-input"
                          type="file"
                          accept=".csv"
                          onChange={handleFileChange}
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload">
                          <Button
                            data-testid="select-file-btn"
                            variant="outline"
                            className="cursor-pointer"
                            asChild
                          >
                            <span>Select File</span>
                          </Button>
                        </label>
                        {file && (
                          <p className="mt-3 text-sm font-medium text-green-600">
                            ✓ {file.name}
                          </p>
                        )}
                      </div>
                      <Button
                        data-testid="upload-btn"
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="w-full"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Data
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Configure */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  data-testid="configure-section"
                  className="bg-card border border-border/60"
                >
                  <CardHeader className="p-6 border-b border-border/40 bg-muted/20">
                    <CardTitle className="text-2xl font-semibold tracking-tight">
                      Configure Training
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Model Selection */}
                    <div>
                      <Label className="text-base font-semibold mb-3 block">
                        Select Model
                      </Label>
                      <div className="grid grid-cols-1 gap-3">
                        {modelTypes.map((model) => (
                          <div
                            key={model.id}
                            data-testid={`model-option-${model.id}`}
                            onClick={() => setSelectedModel(model.id)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedModel === model.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{model.name}</h4>
                                  {model.type === "deep_learning" && (
                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                                      DL
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {model.description}
                                </p>
                              </div>
                              {selectedModel === model.id && (
                                <CheckCircle className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Feature Selection - Only for traditional ML */}
                    {selectedModel !== "lstm" && (
                      <div>
                        <Label className="text-base font-semibold mb-3 block">
                          Select Features
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          {availableFeatures.map((feature) => (
                            <div
                              key={feature}
                              data-testid={`feature-option-${feature}`}
                              onClick={() => toggleFeature(feature)}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                selectedFeatures.includes(feature)
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/40"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium font-mono">
                                  {feature}
                                </span>
                                {selectedFeatures.includes(feature) && (
                                  <CheckCircle className="h-4 w-4 text-primary" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* LSTM Info */}
                    {selectedModel === "lstm" && (
                      <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200">
                        <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          LSTM Sequential Learning
                        </h4>
                        <p className="text-sm text-indigo-700">
                          LSTM automatically learns from clickstream sequences (page visits in order). 
                          No manual feature selection needed. The model will analyze user navigation patterns 
                          to predict purchase probability.
                        </p>
                      </div>
                    )}

                    <Button
                      data-testid="train-model-btn"
                      onClick={handleTrain}
                      disabled={(selectedModel !== "lstm" && selectedFeatures.length === 0) || training}
                      className="w-full"
                    >
                      {training ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Training...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Start Training
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Training Results */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card
                data-testid="training-results"
                className="bg-card border border-border/60"
              >
                <CardHeader className="p-6 border-b border-border/40 bg-muted/20">
                  <CardTitle className="text-xl font-semibold tracking-tight">
                    Training History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {trainingJobs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No training jobs yet
                      </p>
                    ) : (
                      trainingJobs.map((job) => (
                        <div
                          key={job.id}
                          data-testid={`job-${job.id}`}
                          className="p-4 rounded-lg border border-border/60 bg-muted/20"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold capitalize">
                                  {job.model_type.replace("_", " ")}
                                </p>
                                {job.model_type === "lstm" && (
                                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                                    DL
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(job.created_at).toLocaleString()}
                              </p>
                            </div>
                            {job.status === "completed" && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                            {job.status === "failed" && (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            {job.status === "training" && (
                              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                            )}
                          </div>

                          {job.metrics && (
                            <div className="space-y-2 mt-3">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                  Accuracy
                                </span>
                                <span className="font-mono font-semibold">
                                  {(job.metrics.accuracy * 100).toFixed(2)}%
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                  Precision
                                </span>
                                <span className="font-mono font-semibold">
                                  {(job.metrics.precision * 100).toFixed(2)}%
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                  Recall
                                </span>
                                <span className="font-mono font-semibold">
                                  {(job.metrics.recall * 100).toFixed(2)}%
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                  F1 Score
                                </span>
                                <span className="font-mono font-semibold">
                                  {(job.metrics.f1_score * 100).toFixed(2)}%
                                </span>
                              </div>
                            </div>
                          )}

                          {job.status === "completed" && (
                            <Button
                              data-testid={`download-btn-${job.id}`}
                              onClick={() => handleDownload(job.id)}
                              variant="outline"
                              size="sm"
                              className="w-full mt-3"
                            >
                              <Download className="mr-2 h-3 w-3" />
                              Download Model
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Training;
