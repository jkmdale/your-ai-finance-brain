
import React from 'react';
import { User, Mail, Calendar, CreditCard, Trophy, TrendingUp, Target, PieChart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';

const Profile = () => {
  const { user } = useAuth();

  const achievements = [
    { title: 'First Budget Created', icon: PieChart, completed: true },
    { title: 'Goal Achiever', icon: Target, completed: true },
    { title: 'Savings Streak', icon: TrendingUp, completed: false },
    { title: 'Expense Tracker', icon: CreditCard, completed: true },
  ];

  const stats = [
    { label: 'Total Transactions', value: '1,247', change: '+12%', positive: true },
    { label: 'Active Goals', value: '3', change: '+1', positive: true },
    { label: 'Budget Categories', value: '8', change: '0', positive: null },
    { label: 'AI Insights Used', value: '45', change: '+8', positive: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Profile</h1>
            <p className="text-purple-200">Your financial journey overview</p>
          </div>
        </div>

        {/* Profile Information */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Personal Information</CardTitle>
            <CardDescription className="text-purple-200">
              Your account details and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-purple-300" />
                  <span className="text-white">{user?.email || 'user@example.com'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-purple-300" />
                  <span className="text-purple-200">Member since January 2024</span>
                </div>
                <Badge variant="secondary" className="bg-purple-600 text-white">Premium User</Badge>
              </div>
              <Button variant="outline" className="text-purple-200 border-purple-400 hover:bg-purple-600">
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="text-center space-y-2">
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-purple-200 text-sm">{stat.label}</p>
                  {stat.change !== '0' && (
                    <Badge 
                      variant={stat.positive ? "default" : "destructive"}
                      className={stat.positive ? "bg-green-600" : ""}
                    >
                      {stat.change}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Financial Progress */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Financial Progress</span>
            </CardTitle>
            <CardDescription className="text-purple-200">
              Your journey towards financial wellness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-purple-200">Emergency Fund Goal</span>
                <span className="text-white">75%</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-purple-200">Debt Reduction</span>
                <span className="text-white">45%</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-purple-200">Investment Portfolio</span>
                <span className="text-white">60%</span>
              </div>
              <Progress value={60} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Trophy className="w-5 h-5" />
              <span>Achievements</span>
            </CardTitle>
            <CardDescription className="text-purple-200">
              Milestones you've reached on your financial journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement, index) => (
                <div 
                  key={index} 
                  className={`flex items-center space-x-3 p-3 rounded-lg border ${
                    achievement.completed 
                      ? 'bg-green-500/20 border-green-500/30' 
                      : 'bg-gray-500/20 border-gray-500/30'
                  }`}
                >
                  <achievement.icon 
                    className={`w-6 h-6 ${
                      achievement.completed ? 'text-green-400' : 'text-gray-400'
                    }`} 
                  />
                  <span className={achievement.completed ? 'text-white' : 'text-gray-400'}>
                    {achievement.title}
                  </span>
                  {achievement.completed && (
                    <Badge className="bg-green-600 text-white ml-auto">
                      Completed
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
