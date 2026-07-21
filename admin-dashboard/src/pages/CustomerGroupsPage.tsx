import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, CircularProgress, IconButton, List, ListItem, ListItemText,
  ListItemSecondaryAction, Chip, Paper,
} from '@mui/material';
import { Add as AddIcon, ArrowBack as ArrowBackIcon, Edit as EditIcon, Delete as DeleteIcon, Group as GroupIcon } from '@mui/icons-material';
import { groupsApi, type CustomerGroup } from '../api/groups';
import { useBusiness } from '../context/BusinessContext';

export default function CustomerGroupsPage() {
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerGroup | null>(null);
  const [name, setName] = useState('');
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    try {
      const { data } = await groupsApi.list(currentBusinessId);
      setGroups(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load groups'); }
    setLoading(false);
  }, [currentBusinessId]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleOpenCreate = () => {
    setEditing(null);
    setName('');
    setDiscount(0);
    setDialogOpen(true);
  };

  const handleOpenEdit = (g: CustomerGroup) => {
    setEditing(g);
    setName(g.name);
    setDiscount(g.discount);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentBusinessId || !name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await groupsApi.update(currentBusinessId, editing.id, { name: name.trim(), discount });
      } else {
        await groupsApi.create(currentBusinessId, { name: name.trim(), discount });
      }
      setDialogOpen(false);
      fetchGroups();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save group');
    }
    setSaving(false);
  };

  const handleDelete = async (g: CustomerGroup) => {
    if (!currentBusinessId || !window.confirm(`Delete group "${g.name}"?`)) return;
    try {
      await groupsApi.delete(currentBusinessId, g.id);
      fetchGroups();
    } catch { setError('Failed to delete group'); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/customers')}><ArrowBackIcon /></IconButton>
        <GroupIcon color="primary" />
        <Typography variant="h4" sx={{ flex: 1 }}>Customer Groups</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>Add Group</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <CircularProgress /> : (
        <Paper>
          <List>
            {groups.map((g) => (
              <ListItem key={g.id} divider>
                <ListItemText primary={g.name} secondary={`${g._count?.customers || 0} customers | Discount: ${g.discount}%`} />
                <ListItemSecondaryAction>
                  <IconButton onClick={() => handleOpenEdit(g)}><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(g)} color="error"><DeleteIcon /></IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {groups.length === 0 && <ListItem><ListItemText primary="No groups yet" /></ListItem>}
          </List>
        </Paper>
      )}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>{editing ? 'Edit Group' : 'Add Group'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
            <TextField label="Group Name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            <TextField label="Discount (%)" type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} inputProps={{ min: 0, max: 100 }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? <CircularProgress size={20} /> : editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
