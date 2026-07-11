import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Tabs, Tab, Alert, Avatar, Tooltip, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Checkbox, FormGroup, FormControlLabel,
  Divider, Switch,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon, Delete as DeleteIcon, Edit as EditIcon,
  ContentCopy as CopyIcon, Cancel as CancelIcon, People as PeopleIcon,
  Mail as MailIcon, Phone as PhoneIcon, Shield as ShieldIcon,
} from '@mui/icons-material';
import { staffApi, PERMISSION_GROUPS, ROLE_LABELS, ROLE_COLORS, type StaffMember, type StaffInvite } from '../api/staff';
import { useBusiness } from '../context/BusinessContext';

export default function StaffPage() {
  const { currentBusinessId } = useBusiness();
  const [tab, setTab] = useState(0);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [inviteForm, setInviteForm] = useState({
    name: '',
    phone: '',
    email: '',
    rolePreset: 'sales',
    customPermissions: false,
    permissions: [] as string[],
  });

  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editRole, setEditRole] = useState('BUSINESS_EDITOR');

  const loadData = useCallback(async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    try {
      const [staffRes, inviteRes] = await Promise.all([
        staffApi.listStaff(currentBusinessId),
        staffApi.listInvites(currentBusinessId),
      ]);
      setStaff(staffRes.data as any);
      setInvites(inviteRes.data as any);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load staff');
    }
    setLoading(false);
  }, [currentBusinessId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleInvite = async () => {
    if (!currentBusinessId || !inviteForm.phone) return;
    try {
      await staffApi.invite(currentBusinessId, {
        name: inviteForm.name,
        phone: inviteForm.phone,
        email: inviteForm.email || undefined,
        rolePreset: inviteForm.rolePreset,
        permissions: inviteForm.customPermissions ? inviteForm.permissions : undefined,
      });
      setInviteOpen(false);
      setInviteForm({ name: '', phone: '', email: '', rolePreset: 'sales', customPermissions: false, permissions: [] });
      setSuccess('Invitation sent successfully');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send invitation');
    }
  };

  const handleEditPermissions = async () => {
    if (!currentBusinessId || !editingStaff) return;
    try {
      await staffApi.updatePermissions(currentBusinessId, editingStaff.userId, {
        permissions: editPermissions,
        role: editRole,
      });
      setEditOpen(false);
      setSuccess('Permissions updated');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update permissions');
    }
  };

  const handleRemove = async (userId: string) => {
    if (!currentBusinessId || !confirm('Remove this staff member?')) return;
    try {
      await staffApi.removeStaff(currentBusinessId, userId);
      setSuccess('Staff member removed');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove staff');
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!currentBusinessId) return;
    try {
      await staffApi.cancelInvite(currentBusinessId, inviteId);
      setSuccess('Invitation cancelled');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel invitation');
    }
  };

  const togglePermission = (perm: string) => {
    setEditPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const toggleResourcePermissions = (resource: string, actions: string[]) => {
    const allPerms = actions.map((a) => `${resource}.${a}`);
    const allSelected = allPerms.every((p) => editPermissions.includes(p));
    if (allSelected) {
      setEditPermissions((prev) => prev.filter((p) => !p.startsWith(`${resource}.`)));
    } else {
      setEditPermissions((prev) => [...new Set([...prev, ...allPerms])]);
    }
  };

  const getPresetPermissions = (preset: string) => {
    const presetMap: Record<string, string[]> = {
      owner: PERMISSION_GROUPS.flatMap((g) => g.actions.map((a) => `${g.resource}.${a}`)),
      admin: PERMISSION_GROUPS.flatMap((g) => g.actions.map((a) => `${g.resource}.${a}`)),
      manager: [
        'dashboard.view',
        ...PERMISSION_GROUPS.filter((g) => ['customers', 'products', 'invoices', 'payments', 'warehouses'].includes(g.resource))
          .flatMap((g) => g.actions.map((a) => `${g.resource}.${a}`)),
        'reports.view',
      ],
      accountant: [
        'dashboard.view', 'customers.view',
        'invoices.view', 'invoices.create',
        'payments.view', 'payments.create', 'payments.delete',
        'reports.view', 'reports.export',
      ],
      sales: [
        'dashboard.view', 'customers.view', 'customers.create',
        'invoices.view', 'invoices.create',
      ],
      viewer: PERMISSION_GROUPS.map((g) => `${g.resource}.view`),
    };
    return presetMap[preset] || [];
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Staff Management</Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setInviteOpen(true)}
          sx={{ bgcolor: '#1a237e' }}
        >
          Invite Staff
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`Staff (${staff.length})`} icon={<PeopleIcon />} iconPosition="start" />
          <Tab label={`Pending Invites (${invites.length})`} icon={<MailIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : tab === 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Permissions</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: '#1a237e', fontSize: 14 }}>
                        {member.name?.charAt(0)?.toUpperCase() || '?'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{member.name || 'Unknown'}</Typography>
                        {member.email && <Typography variant="caption" color="text.secondary">{member.email}</Typography>}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{member.phone}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={member.isDefault ? 'Owner' : ROLE_LABELS[member.role] || member.role}
                      sx={{
                        bgcolor: member.isDefault ? '#ff8f00' : ROLE_COLORS[member.role] || '#757575',
                        color: 'white',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {member.isDefault ? (
                        <Chip size="small" label="All permissions" color="success" variant="outlined" />
                      ) : (
                        <>
                          {(member.permissions as string[] || []).slice(0, 3).map((p) => (
                            <Chip key={p} size="small" label={p} variant="outlined" sx={{ fontSize: 11 }} />
                          ))}
                          {(member.permissions as string[] || []).length > 3 && (
                            <Chip size="small" label={`+${(member.permissions as string[]).length - 3}`} variant="outlined" />
                          )}
                        </>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {!member.isDefault && (
                      <>
                        <Tooltip title="Edit Permissions">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingStaff(member);
                              setEditPermissions((member.permissions as string[]) || []);
                              setEditRole(member.role);
                              setEditOpen(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove">
                          <IconButton size="small" color="error" onClick={() => handleRemove(member.userId)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name / Phone</TableCell>
                <TableCell>Role Preset</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Sent By</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary" py={4}>No pending invitations</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                invites.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Typography fontWeight={600}>{inv.name || 'Unknown'}</Typography>
                      <Typography variant="caption" color="text.secondary">{inv.phone}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={ROLE_LABELS[inv.role] || inv.role} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>{inv.invitedBy}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Cancel Invitation">
                        <IconButton size="small" color="error" onClick={() => handleCancelInvite(inv.id)}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Staff Member</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Name"
              value={inviteForm.name}
              onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Phone Number *"
              value={inviteForm.phone}
              onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Email (optional)"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Role Preset</InputLabel>
              <Select
                value={inviteForm.rolePreset}
                label="Role Preset"
                onChange={(e) => setInviteForm({ ...inviteForm, rolePreset: e.target.value })}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="accountant">Accountant</MenuItem>
                <MenuItem value="sales">Sales</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>
            <Alert severity="info" sx={{ fontSize: 13 }}>
              The invited person will receive a link to join. If they don't have an account, they'll need to register first.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleInvite}
            disabled={!inviteForm.phone}
            sx={{ bgcolor: '#1a237e' }}
          >
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShieldIcon />
            Edit Permissions — {editingStaff?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={editRole}
                label="Role"
                onChange={(e) => {
                  setEditRole(e.target.value);
                  const roleToPreset: Record<string, string> = {
                    BUSINESS_ADMIN: 'admin',
                    BUSINESS_EDITOR: 'manager',
                    BUSINESS_VIEWER: 'viewer',
                  };
                  const preset = roleToPreset[e.target.value];
                  if (preset) setEditPermissions(getPresetPermissions(preset));
                }}
              >
                <MenuItem value="BUSINESS_ADMIN">Admin</MenuItem>
                <MenuItem value="BUSINESS_EDITOR">Editor</MenuItem>
                <MenuItem value="BUSINESS_VIEWER">Viewer</MenuItem>
              </Select>
            </FormControl>

            {PERMISSION_GROUPS.map((group) => {
              const allSelected = group.actions.every((a) => editPermissions.includes(`${group.resource}.${a}`));
              const someSelected = group.actions.some((a) => editPermissions.includes(`${group.resource}.${a}`));
              return (
                <Paper key={group.resource} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={() => toggleResourcePermissions(group.resource, group.actions)}
                    />
                    <Typography fontWeight={600}>{group.label}</Typography>
                  </Box>
                  <FormGroup sx={{ ml: 5 }}>
                    {group.actions.map((action) => (
                      <FormControlLabel
                        key={`${group.resource}.${action}`}
                        control={
                          <Checkbox
                            checked={editPermissions.includes(`${group.resource}.${action}`)}
                            onChange={() => togglePermission(`${group.resource}.${action}`)}
                            size="small"
                          />
                        }
                        label={action.charAt(0).toUpperCase() + action.slice(1)}
                      />
                    ))}
                  </FormGroup>
                </Paper>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditPermissions} sx={{ bgcolor: '#1a237e' }}>
            Save Permissions
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
