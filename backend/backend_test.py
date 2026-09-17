#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime
from pathlib import Path

class CustomerBehaviorAPITester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
    def log_result(self, test_name, success, details="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "data": response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def run_test(self, name, method, endpoint, expected_status=200, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        
        try:
            headers = {}
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, timeout=10)
                else:
                    headers['Content-Type'] = 'application/json'
                    response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                headers['Content-Type'] = 'application/json'
                response = requests.put(url, json=data, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            response_data = None
            
            try:
                response_data = response.json()
            except:
                response_data = response.text[:200] if len(response.text) <= 200 else response.text[:200] + "..."
            
            details = f"Status: {response.status_code}"
            
            self.log_result(name, success, details, response_data if not success else None)
            return success, response_data

        except Exception as e:
            self.log_result(name, False, f"Exception: {str(e)}")
            return False, None

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "")

    def test_analytics_overview(self):
        """Test analytics overview endpoint"""
        return self.run_test("Analytics Overview", "GET", "analytics/overview")

    def test_analytics_click_distribution(self):
        """Test click distribution endpoint"""  
        return self.run_test("Analytics Click Distribution", "GET", "analytics/click-distribution")

    def test_analytics_funnel(self):
        """Test analytics funnel endpoint"""
        return self.run_test("Analytics Funnel", "GET", "analytics/funnel")

    def test_analytics_device_breakdown(self):
        """Test device breakdown endpoint"""
        return self.run_test("Analytics Device Breakdown", "GET", "analytics/device-breakdown")

    def test_analytics_heatmap(self):
        """Test page heatmap endpoint"""
        return self.run_test("Analytics Page Heatmap", "GET", "analytics/page-heatmap")

    def test_training_features(self):
        """Test getting available training features"""
        return self.run_test("Training Features", "GET", "training/features")

    def test_training_jobs(self):
        """Test getting training jobs"""
        return self.run_test("Training Jobs List", "GET", "training/jobs")

    def test_simulator_user_types(self):
        """Test getting user types for simulation"""
        return self.run_test("Simulator User Types", "GET", "simulator/user-types")

    def test_simulator_users(self):
        """Test getting simulated users history"""
        return self.run_test("Simulator Users History", "GET", "simulator/users")

    def test_data_upload(self):
        """Test CSV data upload"""
        sample_csv_path = Path("/tmp/sample_sessions.csv")
        
        if not sample_csv_path.exists():
            self.log_result("Training Data Upload", False, "Sample CSV file not found at /tmp/sample_sessions.csv")
            return False, None
            
        try:
            with open(sample_csv_path, 'rb') as f:
                files = {'file': ('sample_sessions.csv', f, 'text/csv')}
                return self.run_test("Training Data Upload", "POST", "training/upload", 200, files=files)
        except Exception as e:
            self.log_result("Training Data Upload", False, f"File read error: {str(e)}")
            return False, None

    def test_model_training(self):
        """Test model training"""
        training_data = {
            "model_type": "logistic_regression",
            "features": ["total_duration", "avg_duration", "num_actions"],
            "test_size": 0.2
        }
        
        success, response_data = self.run_test("Model Training", "POST", "training/train", 200, training_data)
        
        if success and response_data:
            job_id = response_data.get('id')
            if job_id:
                print(f"   Training job started with ID: {job_id}")
                # Wait a bit for training to process
                time.sleep(2)
                # Check job status
                self.run_test("Training Job Status", "GET", f"training/job/{job_id}")
            
        return success, response_data

    def test_simulator_generate(self):
        """Test user behavior generation"""
        simulation_data = {
            "user_type": "fast_buyer",
            "num_sessions": 10
        }
        
        return self.run_test("Simulator Generate", "POST", "simulator/generate", 200, simulation_data)

    def run_all_tests(self):
        """Run comprehensive API tests"""
        print("=" * 60)
        print("CUSTOMER BEHAVIOR PREDICTION API TESTING")
        print("=" * 60)
        print(f"Backend URL: {self.base_url}")
        print(f"API URL: {self.api_url}")
        print()
        
        # Basic endpoint tests
        print("📍 BASIC ENDPOINTS")
        print("-" * 20)
        self.test_root_endpoint()
        
        # Analytics endpoints
        print("📊 ANALYTICS ENDPOINTS")
        print("-" * 20)
        self.test_analytics_overview()
        self.test_analytics_click_distribution()
        self.test_analytics_funnel()
        self.test_analytics_device_breakdown()
        self.test_analytics_heatmap()
        
        # Training endpoints
        print("🧠 TRAINING ENDPOINTS")
        print("-" * 20)
        self.test_training_features()
        self.test_training_jobs()
        
        # Upload and training (more complex workflow)
        print("📤 TRAINING WORKFLOW")
        print("-" * 20)
        upload_success, _ = self.test_data_upload()
        if upload_success:
            print("   ✅ Data upload successful, proceeding with training...")
            self.test_model_training()
        else:
            print("   ❌ Skipping training test due to upload failure")
        
        # Simulator endpoints
        print("🎭 SIMULATOR ENDPOINTS")
        print("-" * 20)
        self.test_simulator_user_types()
        self.test_simulator_users()
        self.test_simulator_generate()
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['details']}")
        
        print(f"\n🏁 Backend API Testing Complete!")
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = CustomerBehaviorAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())