import React, { useEffect, useState, useCallback } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import EntityModal, { FieldConfig, EditFieldConfig } from '../components/EntityModal';
import ConfirmModal from '../components/ConfirmModal';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';

const serviceColumns = [
  { key: 'service_id', label: 'ID', visible: true, sortable: true },
  { key: 'name', label: 'Название', visible: true, sortable: true },
  { key: 'cost', label: 'Стоимость', visible: true, sortable: true },
  { key: 'period', label: 'Период', visible: true, sortable: true },
  { key: 'category', label: 'Категория', visible: true, sortable: true },
  { key: 'allow_to_order', label: 'Доступна', visible: false, sortable: false },
  { key: 'deleted', label: 'Удалена', visible: false, sortable: false },
  { key: 'descr', label: 'Описание', visible: false, sortable: false },
];

// Поля для просмотра
const serviceModalFields: FieldConfig[] = [
  { key: 'service_id', label: 'ID', copyable: true },
  { key: 'name', label: 'Название' },
  { key: 'cost', label: 'Стоимость' },
  { key: 'period', label: 'Период' },
  { key: 'period_cost', label: 'Стоимость периода' },
  { key: 'category', label: 'Категория' },
  { key: 'allow_to_order', label: 'Доступна для заказа', type: 'boolean' },
  { key: 'deleted', label: 'Удалена', type: 'boolean' },
  { key: 'descr', label: 'Описание' },
  { key: 'config', label: 'Конфигурация', type: 'json' },
];

// Поля для редактирования
const serviceEditFields: EditFieldConfig[] = [
  { key: 'service_id', label: 'ID', type: 'readonly' },
  { key: 'name', label: 'Название', type: 'text', required: true },
  { key: 'cost', label: 'Стоимость', type: 'number', min: 0 },
  { key: 'period', label: 'Период (месяцев)', type: 'number', min: 0 },
  { key: 'period_cost', label: 'Стоимость периода', type: 'number', min: 0 },
  { 
    key: 'category', 
    label: 'Категория', 
    type: 'select', 
    options: [
      { value: '', label: '-- Без категории --' },
      { value: 'hosting', label: 'Хостинг' },
      { value: 'vps', label: 'VPS' },
      { value: 'dedicated', label: 'Выделенный сервер' },
      { value: 'domain', label: 'Домены' },
      { value: 'ssl', label: 'SSL сертификаты' },
      { value: 'other', label: 'Прочее' },
    ]
  },
  { key: 'allow_to_order', label: 'Доступна для заказа', type: 'checkbox' },
  { key: 'deleted', label: 'Удалена', type: 'checkbox' },
  { key: 'descr', label: 'Описание', type: 'textarea' },
  { key: 'config', label: 'Конфигурация (JSON)', type: 'json' },
];

function Services() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback((l: number, o: number, sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `/shm/v1/admin/service?limit=${l}&offset=${o}`;
    if (sf && sd) {
      url += `&sort_field=${sf}&sort_direction=${sd}`;
    }
    shm_request(url)
      .then(res => {
        const { data: items, total: count } = normalizeListResponse(res);
        setData(items);
        setTotal(count);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData(limit, offset, sortField, sortDirection);
  }, [limit, offset, sortField, sortDirection, fetchData]);

  const handlePageChange = (newLimit: number, newOffset: number) => {
    setLimit(newLimit);
    setOffset(newOffset);
  };

  const handleSort = (field: string, direction: SortDirection) => {
    setSortField(direction ? field : undefined);
    setSortDirection(direction);
    setOffset(0);
  };

  const handleRowClick = (row: any) => {
    setSelectedRow(row);
    setModalMode('view');
    setModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedRow({});
    setModalMode('create');
    setModalOpen(true);
  };

  const handleEdit = () => {
    setModalMode('edit');
  };

  const handleSave = async (updatedData: any) => {
    try {
      if (modalMode === 'create') {
        // POST для создания нового
        await shm_request('/shm/v1/admin/service', {
          method: 'POST',
          body: JSON.stringify(updatedData),
        });
      } else {
        // PUT для обновления существующего
        await shm_request(`/shm/v1/admin/service/${updatedData.service_id}`, {
          method: 'PUT',
          body: JSON.stringify(updatedData),
        });
      }
      setModalOpen(false);
      fetchData(limit, offset, sortField, sortDirection);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!selectedRow?.service_id) return;
    setConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRow?.service_id) return;
    
    setDeleting(true);
    setConfirmDelete(false);
    try {
      await shm_request(`/shm/v1/admin/service/${selectedRow.service_id}`, {
        method: 'DELETE',
      });
      setModalOpen(false);
      fetchData(limit, offset, sortField, sortDirection);
    } catch (error) {
      console.error('Ошибка удаления:', error);
      throw error;
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = () => {
    const { service_id, ...rest } = selectedRow;
    setSelectedRow({ ...rest, name: `${rest.name} (копия)` });
    setModalMode('create');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">Услуги</h2>
          <Help content="<b>Услуги</b>: список тарифов и услуг биллинга. Можно редактировать стоимость, период, настройки." />
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors"
          style={{ 
            backgroundColor: 'var(--accent-primary)', 
            color: 'var(--accent-text)' 
          }}
        >
          <span className="text-lg">+</span>
          Добавить услугу
        </button>
      </div>
      <DataTable
        columns={serviceColumns}
        data={data}
        loading={loading}
        total={total}
        limit={limit}
        offset={offset}
        onPageChange={handlePageChange}
        onSort={handleSort}
        sortField={sortField}
        sortDirection={sortDirection}
        onRowClick={handleRowClick}
        onRefresh={() => fetchData(limit, offset, sortField, sortDirection)}
        storageKey="services"
      />
      <EntityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          modalMode === 'create' 
            ? 'Создание услуги' 
            : `Услуга: ${selectedRow?.name || selectedRow?.service_id || ''}`
        }
        data={selectedRow}
        fields={serviceModalFields}
        editFields={serviceEditFields}
        mode={modalMode}
        onEdit={handleEdit}
        onSave={handleSave}
        onDelete={modalMode !== 'create' ? handleDelete : undefined}
        onDuplicate={modalMode !== 'create' ? handleDuplicate : undefined}
        size="lg"
      />

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление услуги"
        message={`Вы уверены, что хотите удалить услугу "${selectedRow?.name}"?`}
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

export default Services;
