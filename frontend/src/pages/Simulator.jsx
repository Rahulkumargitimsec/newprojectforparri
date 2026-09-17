import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Play, Loader2, CheckCircle, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Simulator = () => {
  const [userTypes, setUserTypes] = useState([]);
  const [selectedUserType, setSelectedUserType] = useState("");
  const [numSessions, setNumSessions] = useState(50);
  const [generating, setGenerating] = useState(false);
  const [simulatedUsers, setSimulatedUsers] = useState([]);
  const [generatedSessions, setGeneratedSessions] = useState([]);

  useEffect(() => {
    fetchUserTypes();
    fetchSimulatedUsers();
  }, []);

  const fetchUserTypes = async () => {
    try {
      const response = await axios.get(`${API}/simulator/user-types`);
      setUserTypes(response.data.user_types);
      if (response.data.user_types.length > 0) {
        setSelectedUserType(response.data.user_types[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch user types:", error);
    }
  };

  const fetchSimulatedUsers = async () => {
    try {
      const response = await axios.get(`${API}/simulator/users`);
      setSimulatedUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch simulated users:", error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedUserType) {
      toast.error("Please select a user type");
      return;
    }

    try {
      setGenerating(true);
      const response = await axios.post(`${API}/simulator/generate`, {
        user_type: selectedUserType,
        num_sessions: numSessions,
      });

      setGeneratedSessions(response.data.sample_sessions);
      toast.success(
        `Generated ${response.data.sessions_generated} sessions successfully!`
      );
      fetchSimulatedUsers();
    } catch (error) {
      toast.error("Generation failed: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const selectedUserTypeData = userTypes.find((ut) => ut.id === selectedUserType);

  return (
    <div className="min-h-screen bg-background grid-background" data-testid="simulator-page">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
            User Behavior Simulator
          </h1>
          <p className="text-base text-muted-foreground">
            Generate synthetic web sessions for different user personas
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Simulator Panel */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card
                data-testid="simulator-controls"
                className="bg-card border border-border/60"
              >
                <CardHeader className="p-6 border-b border-border/40 bg-muted/20">
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    Configure Simulation
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* User Type Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">User Type</Label>
                    <Select
                      value={selectedUserType}
                      onValueChange={setSelectedUserType}
                    >
                      <SelectTrigger data-testid="user-type-select">
                        <SelectValue placeholder="Select user type" />
                      </SelectTrigger>
                      <SelectContent>
                        {userTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedUserTypeData && (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/40">
                        <h4 className="font-semibold text-sm mb-1">
                          {selectedUserTypeData.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedUserTypeData.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Number of Sessions */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">
                      Number of Sessions
                    </Label>
                    <Input
                      data-testid="num-sessions-input"
                      type="number"
                      min="1"
                      max="500"
                      value={numSessions}
                      onChange={(e) => setNumSessions(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Generate 1-500 synthetic sessions
                    </p>
                  </div>

                  {/* Generate Button */}
                  <Button
                    data-testid="generate-btn"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full"
                    size="lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5" />
                        Generate Behavior
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Generated Sessions Preview */}
            {generatedSessions.length > 0 && (
              <motion.div
                key="generated-sessions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card
                  data-testid="generated-sessions-preview"
                  className="bg-card border border-border/60"
                >
                  <CardHeader className="p-6 border-b border-border/40 bg-muted/20">
                    <CardTitle className="text-xl font-semibold tracking-tight">
                      Generated Sessions (Preview)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-2 font-mono text-xs bg-muted/30 p-4 rounded-lg max-h-96 overflow-y-auto">
                      {generatedSessions.map((session, index) => (
                        <div
                          key={session.id}
                          data-testid={`session-preview-${index}`}
                          className="p-2 bg-background/50 rounded border border-border/40"
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-muted-foreground">Page:</span>
                            <span className="font-semibold">{session.page}</span>
                            <span className="text-muted-foreground">Action:</span>
                            <span className="font-semibold">{session.action}</span>
                            <span className="text-muted-foreground">Device:</span>
                            <span className="font-semibold">{session.device}</span>
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-semibold">{session.duration}s</span>
                            <span className="text-muted-foreground">Purchase:</span>
                            <span
                              className={
                                session.purchase
                                  ? "text-green-600 font-semibold"
                                  : "text-muted-foreground"
                              }
                            >
                              {session.purchase ? "Yes" : "No"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* User Types List */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card
                data-testid="user-types-list"
                className="bg-card border border-border/60"
              >
                <CardHeader className="p-6 border-b border-border/40 bg-muted/20">
                  <CardTitle className="text-xl font-semibold tracking-tight">
                    Available Personas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {userTypes.map((type) => (
                      <div
                        key={type.id}
                        data-testid={`user-type-${type.id}`}
                        className="p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded bg-primary/10">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{type.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {type.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Simulation History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card
                data-testid="simulation-history"
                className="bg-card border border-border/60"
              >
                <CardHeader className="p-6 border-b border-border/40 bg-muted/20">
                  <CardTitle className="text-xl font-semibold tracking-tight">
                    Simulation History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {simulatedUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No simulations yet
                      </p>
                    ) : (
                      simulatedUsers.map((user, index) => (
                        <div
                          key={user.id}
                          data-testid={`simulated-user-${index}`}
                          className="p-3 rounded-lg border border-border/60 bg-muted/20"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold capitalize">
                                {user.user_type.replace("_", " ")}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {user.sessions_count} sessions
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(user.created_at).toLocaleString()}
                              </p>
                            </div>
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
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

export default Simulator;
