import React from 'react';
import { useTranslation } from 'react-i18next';
import CrudManager from '../../components/common/CrudManager';
import { ENDPOINTS } from '../../services/endpoints';
import { ROLES } from '../../utils/constants';
import { fullName } from '../../utils/helpers';

function Users() {
    const { t } = useTranslation();

    const formFields = [
        {
            name: 'email',
            label: t('common.email', 'Email'),
            type: 'email',
            required: true,
        },
        {
            name: 'password',
            label: t('common.password', 'Password'),
            type: 'password',
            required: true,
            createOnly: true,
        },
        {
            name: 'fullName',
            label: t('common.fullName', 'Full Name'),
            type: 'text',
            required: true,
        },
        {
            name: 'role',
            label: t('common.role', 'Role'),
            type: 'select',
            options: [
                {
                    value: 'admin',
                    label: t('roles.admin', 'Admin'),
                },
                {
                    value: 'staff',
                    label: t('roles.staff', 'Staff'),
                },
                {
                    value: 'teacher',
                    label: t('roles.teacher', 'Teacher'),
                },
                {
                    value: 'student',
                    label: t('roles.student', 'Student'),
                },
            ],
            required: true,
        },
        {
            name: 'status',
            label: t('common.status', 'Status'),
            type: 'select',
            options: [
                {
                    value: 'active',
                    label: t('status.active', 'Active'),
                },
                {
                    value: 'suspended',
                    label: t('status.suspended', 'Suspended'),
                },
            ],
            required: true,
        },
    ];

    return (
        <CrudManager
            title={t('users.title', 'Users')}
            endpoint={ENDPOINTS.auth}
            formFields={formFields}
            writeRoles={[ROLES.ADMIN]}
            deleteRoles={[ROLES.ADMIN]}
            columns={[
                {
                    id: 'index',
                    label: '#',
                    render: (_, __, index) => index + 1,
                },
                {
                    id: 'fullName',
                    label: t('common.name', 'Name'),
                    render: (row) => row.fullName || fullName(row),
                },
                {
                    id: 'email',
                    label: t('common.email', 'Email'),
                },
                {
                    id: 'role',
                    label: t('common.role', 'Role'),
                },
                {
                    id: 'status',
                    label: t('common.status', 'Status'),
                },
            ]}
        />
    );
}

export default Users;