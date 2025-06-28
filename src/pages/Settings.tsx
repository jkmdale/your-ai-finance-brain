
import React from 'react';
import { Settings as SettingsIcon, User, Shield, Bell, Palette, Database, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const Settings = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <p className="text-purple-200">Customize your SmartFinanceAI experience</p>
          </div>
        </div>

        {/* Account Settings */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Account Settings</span>
            </CardTitle>
            <CardDescription className="text-purple-200">
              Manage your account preferences and personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Email Notifications</p>
                <p className="text-purple-200 text-sm">Receive updates about your financial activity</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator className="bg-white/20" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Two-Factor Authentication</p>
                <p className="text-purple-200 text-sm">Add an extra layer of security to your account</p>
              </div>
              <Badge variant="outline" className="text-green-400 border-green-400">Enabled</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Privacy & Security</span>
            </CardTitle>
            <CardDescription className="text-purple-200">
              Control your privacy settings and security preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Data Encryption</p>
                <p className="text-purple-200 text-sm">All your financial data is encrypted end-to-end</p>
              </div>
              <Lock className="w-5 h-5 text-green-400" />
            </div>
            <Separator className="bg-white/20" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Analytics Sharing</p>
                <p className="text-purple-200 text-sm">Help improve our AI with anonymous usage data</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
            </CardTitle>
            <CardDescription className="text-purple-200">
              Choose what notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Budget Alerts</p>
                <p className="text-purple-200 text-sm">Get notified when you're close to budget limits</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator className="bg-white/20" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Goal Reminders</p>
                <p className="text-purple-200 text-sm">Receive reminders about your financial goals</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator className="bg-white/20" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">AI Insights</p>
                <p className="text-purple-200 text-sm">Get personalized financial insights and tips</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Data Management</span>
            </CardTitle>
            <CardDescription className="text-purple-200">
              Manage your financial data and export options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Export Data</p>
                <p className="text-purple-200 text-sm">Download your financial data in CSV format</p>
              </div>
              <Button variant="outline" className="text-purple-200 border-purple-400 hover:bg-purple-600">
                Export
              </Button>
            </div>
            <Separator className="bg-white/20" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Delete Account</p>
                <p className="text-purple-200 text-sm">Permanently delete your account and all data</p>
              </div>
              <Button variant="destructive">
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
