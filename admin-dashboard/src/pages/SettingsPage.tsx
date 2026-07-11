import { Box, Typography, Paper, TextField, Button, Divider } from '@mui/material';
import { useState } from 'react';

export default function SettingsPage() {
  const [profile, setProfile] = useState({ name: '', phone: '', email: '' });

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Settings</Typography>
      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Profile Settings</Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          <TextField label="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          <TextField label="Email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          <Button variant="contained" sx={{ alignSelf: 'flex-start' }}>Save Changes</Button>
        </Box>
      </Paper>
    </Box>
  );
}
