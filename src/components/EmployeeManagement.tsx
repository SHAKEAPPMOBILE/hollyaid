import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Mail, Clock, CheckCircle, XCircle, Users, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface Company {
  id: string;
  name: string;
  email_domain: string;
  max_employees: number;
}

interface Employee {
  id: string;
  email: string;
  status: string;
  invited_at: string;
  accepted_at: string | null;
}

interface EmployeeManagementProps {
  company: Company;
}

const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ company }) => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [invitingAll, setInvitingAll] = useState(false);
  const [employeeToRemove, setEmployeeToRemove] = useState<Employee | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [company.id]);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('company_employees')
      .select('*')
      .eq('company_id', company.id)
      .order('invited_at', { ascending: false });

    if (!error && data) {
      setEmployees(data);
    }
    setLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.endsWith(`@${company.email_domain}`)) {
      toast({
        title: "Invalid email",
        description: `Employee email must end with @${company.email_domain}`,
        variant: "destructive",
      });
      return;
    }

    if (employees.length >= company.max_employees) {
      toast({
        title: "Limit reached",
        description: `You can only invite up to ${company.max_employees} employees.`,
        variant: "destructive",
      });
      return;
    }

    setInviting(true);

    const { error } = await supabase
      .from('company_employees')
      .insert({
        company_id: company.id,
        email: inviteEmail.toLowerCase(),
        status: 'invited',
      });

    if (error) {
      toast({
        title: "Invitation failed",
        description: error.message.includes('duplicate') 
          ? "This employee has already been invited."
          : error.message,
        variant: "destructive",
      });
    } else {
      // Send invitation email
      try {
        await supabase.functions.invoke('send-employee-invite', {
          body: { 
            employeeEmail: inviteEmail.toLowerCase(),
            companyId: company.id
          }
        });
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
      }

      toast({
        title: "Invitation sent!",
        description: `An invitation email has been sent to ${inviteEmail}`,
      });
      setInviteEmail('');
      fetchEmployees();
    }

    setInviting(false);
  };

  const handleInviteAll = async () => {
    const pendingEmployees = employees.filter(e => e.status === 'invited');
    
    if (pendingEmployees.length === 0) {
      toast({
        title: "No pending invitations",
        description: "All employees have already accepted their invitations.",
      });
      return;
    }

    setInvitingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const employee of pendingEmployees) {
      try {
        await supabase.functions.invoke('send-employee-invite', {
          body: { 
            employeeEmail: employee.email,
            companyId: company.id
          }
        });
        successCount++;
      } catch (error) {
        console.error('Failed to send invitation to:', employee.email, error);
        failCount++;
      }
    }

    toast({
      title: "Invitations sent",
      description: `${successCount} invitation${successCount !== 1 ? 's' : ''} sent${failCount > 0 ? `, ${failCount} failed` : ''}.`,
    });

    setInvitingAll(false);
  };

  const handleRemoveEmployee = async () => {
    if (!employeeToRemove) return;
    
    setRemoving(true);
    
    const { error } = await supabase
      .from('company_employees')
      .delete()
      .eq('id', employeeToRemove.id);

    if (error) {
      toast({
        title: "Removal failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Employee removed",
        description: `${employeeToRemove.email} has been removed from the company.`,
      });
      fetchEmployees();
    }
    
    setRemoving(false);
    setEmployeeToRemove(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'invited':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock size={12} /> Pending</Badge>;
      case 'accepted':
        return <Badge className="bg-primary flex items-center gap-1"><CheckCircle size={12} /> Active</Badge>;
      case 'revoked':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle size={12} /> Revoked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="text-primary" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">{employees.length}</p>
                <p className="text-sm text-muted-foreground">Total Invited</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <CheckCircle className="text-primary" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {employees.filter(e => e.status === 'accepted').length}
                </p>
                <p className="text-sm text-muted-foreground">Accepted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-secondary">
                <Clock className="text-muted-foreground" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {company.max_employees - employees.length}
                </p>
                <p className="text-sm text-muted-foreground">Spots Remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus size={20} />
            Invite Employee
          </CardTitle>
          <CardDescription>
            Invite employees using their @{company.email_domain} email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-4">
            <div className="flex-1">
              <Input
                type="email"
                placeholder={`employee@${company.email_domain}`}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="wellness" disabled={inviting}>
              <Mail size={16} />
              {inviting ? 'Sending...' : 'Send Invite'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Invited Employees</CardTitle>
            <CardDescription>
              {employees.length} of {company.max_employees} employee slots used
            </CardDescription>
          </div>
          {employees.filter(e => e.status === 'invited').length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={invitingAll}
                >
                  <Mail size={16} />
                  {invitingAll ? 'Sending...' : `Resend All (${employees.filter(e => e.status === 'invited').length})`}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Send All Invitations?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send invitation emails to {employees.filter(e => e.status === 'invited').length} pending employee{employees.filter(e => e.status === 'invited').length !== 1 ? 's' : ''}. Are you sure you want to continue?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleInviteAll}>
                    Yes, Send All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No employees invited yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.email}</TableCell>
                    <TableCell>{getStatusBadge(employee.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(employee.invited_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {employee.accepted_at 
                        ? format(new Date(employee.accepted_at), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEmployeeToRemove(employee)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!employeeToRemove} onOpenChange={() => setEmployeeToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive" size={20} />
              Remove Employee
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to remove <strong>{employeeToRemove?.email}</strong> from {company.name}?
              {employeeToRemove?.status === 'accepted' && (
                <p className="mt-2 text-destructive">
                  This employee has already joined and will lose access to book specialists.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEmployeeToRemove(null)} disabled={removing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveEmployee} disabled={removing}>
              {removing ? 'Removing...' : 'Yes, Remove Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeManagement;
