import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Activity, Users, ShoppingCart, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ["#0F172A", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [clickDistribution, setClickDistribution] = useState([]);
  const [funnelData, setFunnelData] = useState([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [overviewRes, clickRes, funnelRes, deviceRes] = await Promise.all([
        axios.get(`${API}/analytics/overview`),
        axios.get(`${API}/analytics/click-distribution`),
        axios.get(`${API}/analytics/funnel`),
        axios.get(`${API}/analytics/device-breakdown`),
      ]);

      setOverview(overviewRes.data);
      setClickDistribution(clickRes.data);
      setFunnelData(funnelRes.data);
      setDeviceBreakdown(deviceRes.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const metrics = [
    {
      title: "Total Sessions",
      value: overview?.total_sessions || 0,
      icon: Activity,
      color: "text-blue-600",
      testId: "metric-total-sessions",
    },
    {
      title: "Total Users",
      value: overview?.total_users || 0,
      icon: Users,
      color: "text-green-600",
      testId: "metric-total-users",
    },
    {
      title: "Total Purchases",
      value: overview?.total_purchases || 0,
      icon: ShoppingCart,
      color: "text-orange-600",
      testId: "metric-total-purchases",
    },
    {
      title: "Conversion Rate",
      value: `${overview?.conversion_rate || 0}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      testId: "metric-conversion-rate",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grid-background" data-testid="dashboard-page">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-base text-muted-foreground">
            Customer behavior insights and web usage analytics
          </p>
        </motion.div>

        {/* Metrics Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.4 }}
            >
              <Card
                data-testid={metric.testId}
                className="metric-card bg-card border border-border/60 hover:border-primary/20 transition-colors duration-300"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {metric.title}
                      </p>
                      <p className="text-3xl font-bold tracking-tight">
                        {metric.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg bg-muted/50 ${metric.color}`}>
                      <metric.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card
              data-testid="funnel-chart-card"
              className="bg-card border border-border/60 h-full"
            >
              <CardHeader className="p-6 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  Conversion Funnel
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar dataKey="count" fill="#0F172A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Click Distribution */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Card
              data-testid="click-distribution-card"
              className="bg-card border border-border/60 h-full"
            >
              <CardHeader className="p-6 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  Click Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={clickDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {clickDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Device Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="lg:col-span-2"
          >
            <Card
              data-testid="device-breakdown-card"
              className="bg-card border border-border/60"
            >
              <CardHeader className="p-6 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  Device Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={deviceBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
