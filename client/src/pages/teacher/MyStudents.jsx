import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Avatar, DataTable, PageHeader } from '../../design-system/components';

export default function MyStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/teacher/students').then(r => { if (r.data.success) setStudents(r.data.students); }).finally(() => setLoading(false)); }, []);

  const columns = [
    { key: 'name', label: 'Name', render: (student) => <div className="va-person-cell"><Avatar name={student.displayName || student.name} tone={students.indexOf(student) % 2 ? 'pink' : 'teal'} /><strong>{student.displayName || student.name}</strong></div> },
    { key: 'grade', label: 'Grade', render: (student) => student.grade || 'NA' },
    { key: 'board', label: 'Board', render: (student) => student.board || 'NA' },
    { key: 'course', label: 'Course', render: (student) => student.course?.title?.trim() || 'NA' },
  ];
  return <div className="va-dashboard-stack"><PageHeader title="My Students" subtitle={students.length + ' students assigned to you'} /><DataTable title="Assigned students" columns={columns} rows={students} getRowKey={(student) => student._id} searchKeys={['name', 'displayName', 'grade', 'board']} searchPlaceholder="Search students…" pageSize={10} loading={loading} emptyTitle="No students assigned yet" /></div>;
}
