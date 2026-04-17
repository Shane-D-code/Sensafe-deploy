import React, { useState } from 'react';
import { Save, Bell, Shield, Database, CheckCircle } from 'lucide-react';

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-red-600' : 'bg-gray-700'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

function Settings() {
  const [settings, setSettings] = useState({
    notifications: { emailAlerts: true, pushNotifications: false, smsAlerts: true },
    security: { twoFactorAuth: false, sessionTimeout: '30', passwordExpiry: '90' },
    system: { maintenanceMode: false, debugMode: false, logLevel: 'info' },
  });
  const [saved, setSaved] = useState(false);

  const set = (cat, key, val) => setSettings(p => ({ ...p, [cat]: { ...p[cat], [key]: val } }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Section = ({ icon: Icon, title, children }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-gray-400" /> {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );

  const Row = ({ label, sub, children }) => (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-gray-300">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 text-sm mt-0.5">Configure dashboard preferences</p>
        </div>
        <button onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            saved ? 'bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
          }`}>
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <Section icon={Bell} title="Notifications">
        <Row label="Email Alerts" sub="Receive alerts via email">
          <Toggle checked={settings.notifications.emailAlerts} onChange={v => set('notifications', 'emailAlerts', v)} />
        </Row>
        <Row label="Push Notifications" sub="Browser push notifications">
          <Toggle checked={settings.notifications.pushNotifications} onChange={v => set('notifications', 'pushNotifications', v)} />
        </Row>
        <Row label="SMS Alerts" sub="Critical alerts via SMS">
          <Toggle checked={settings.notifications.smsAlerts} onChange={v => set('notifications', 'smsAlerts', v)} />
        </Row>
      </Section>

      <Section icon={Shield} title="Security">
        <Row label="Two-Factor Authentication" sub="Extra layer of security">
          <Toggle checked={settings.security.twoFactorAuth} onChange={v => set('security', 'twoFactorAuth', v)} />
        </Row>
        <Row label="Session Timeout (minutes)" sub="Auto-logout after inactivity">
          <select value={settings.security.sessionTimeout} onChange={e => set('security', 'sessionTimeout', e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
            {['15','30','60','120'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Row>
        <Row label="Password Expiry (days)" sub="Force password change interval">
          <select value={settings.security.passwordExpiry} onChange={e => set('security', 'passwordExpiry', e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
            {['30','60','90','180'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Row>
      </Section>

      <Section icon={Database} title="System">
        <Row label="Maintenance Mode" sub="Put system in maintenance mode">
          <Toggle checked={settings.system.maintenanceMode} onChange={v => set('system', 'maintenanceMode', v)} />
        </Row>
        <Row label="Debug Mode" sub="Enable detailed logging">
          <Toggle checked={settings.system.debugMode} onChange={v => set('system', 'debugMode', v)} />
        </Row>
        <Row label="Log Level" sub="Set logging verbosity">
          <select value={settings.system.logLevel} onChange={e => set('system', 'logLevel', e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
            {['error','warn','info','debug'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Row>
      </Section>

      {/* Backend info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-3">Backend Connection</h2>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-gray-300">Connected to</span>
          <code className="text-xs bg-gray-800 border border-gray-700 px-2 py-1 rounded text-gray-300">
            100.31.117.111:8000
          </code>
        </div>
      </div>
    </div>
  );
}

export default Settings;
