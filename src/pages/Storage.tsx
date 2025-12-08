import React, { useEffect, useState, useCallback } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import Help from '../components/Help';
import EntityModal, { FieldConfig } from '../components/EntityModal';
import { shm_request, normalizeListResponse } from '../lib/shm_request';

const storageColumns = [
  { key: 'user_id', label: 'User ID', visible: true, sortable: true },
  { key: 'name', label: 'Название', visible: true, sortable: true },
  { key: 'settings', label: 'Settings', visible: true, sortable: false },
  { key: 'created', label: 'Создано', visible: false, sortable: true },
  { key: 'user_service_id', label: 'ID услуги Пользователя', visible: false, sortable: true },
];

const modalFields: FieldConfig[] = [
  { key: 'user_id', label: 'User ID', linkTo: '/users', copyable: true },
  { key: 'name', label: 'Название' },
  { key: 'user_service_id', label: 'ID услуги Пользователя', linkTo: '/user-services' },
  { key: 'created', label: 'Создано', type: 'datetime' },
  { key: 'settings', label: 'Settings', type: 'json' },
];

function Storage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback((l: number, o: number, sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `/shm/v1/admin/storage/manage?limit=${l}&offset=${o}`;
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
    setModalOpen(true);
  };

  return (
    <div>
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-bold">Хранилище</h2>
        <Help content="<b>Хранилище</b>: данные пользователей, сохраненные в key-value формате." />
      </div>
      <DataTable
        columns={storageColumns}
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
        storageKey="storage"
      />
      <EntityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Хранилище: ${selectedRow?.name || ''}`}
        data={selectedRow}
        fields={modalFields}
      />
    </div>
  );
}

export default Storage;
