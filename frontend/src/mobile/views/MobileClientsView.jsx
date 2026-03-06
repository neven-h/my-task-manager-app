import React from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { FONT_STACK, THEME } from '../theme';
import useMobileClients from '../hooks/useMobileClients';
import MobileClientList from '../components/clients/MobileClientList';
import MobileClientTasksPanel from '../components/clients/MobileClientTasksPanel';
import MobileAddClientForm from '../components/clients/MobileAddClientForm';

const MobileClientsView = ({ authUser, onBack }) => {
    const {
        clients, selectedClient, setSelectedClient, clientTasks,
        loading, showAddForm, setShowAddForm,
        newClient, setNewClient, createLoading,
        fetchClientTasks, handleCreateClient, handleDeleteClient
    } = useMobileClients(authUser);

    return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: FONT_STACK }}>
            {/* Header */}
            <div style={{ background: '#fff', borderBottom: '3px solid #000', padding: '16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', padding: '12px', cursor: 'pointer', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>CLIENTS</h1>
                </div>
            </div>

            {/* Clients List */}
            <div style={{ padding: '16px' }}>
                <MobileClientList
                    clients={clients} loading={loading} selectedClient={selectedClient}
                    onClientClick={fetchClientTasks} onDeleteClient={handleDeleteClient}
                />
            </div>

            <MobileClientTasksPanel
                selectedClient={selectedClient} clientTasks={clientTasks}
                onClose={() => setSelectedClient(null)}
            />

            {/* Add Client Button */}
            <button
                onClick={() => setShowAddForm(true)}
                style={{ position: 'fixed', bottom: '20px', right: '20px', width: '64px', height: '64px', borderRadius: '50%', background: THEME.primary, border: '3px solid #000', boxShadow: '4px 4px 0px #000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 90 }}
            >
                <Plus size={32} color="#fff" strokeWidth={3} />
            </button>

            {showAddForm && (
                <MobileAddClientForm
                    newClient={newClient} setNewClient={setNewClient}
                    createLoading={createLoading}
                    onClose={() => setShowAddForm(false)}
                    onSubmit={handleCreateClient}
                />
            )}
        </div>
    );
};

export default MobileClientsView;
