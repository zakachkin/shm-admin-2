import React, { useEffect, useState, useCallback } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import EntityModal, { FieldConfig } from '../components/EntityModal';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';

const payColumns = [
  { key: 'id', label: 'ID', visible: true, sortable: true },
  { key: 'user_id', label: 'Пользователь', visible: true, sortable: true },
  { key: 'money', label: 'Сумма', visible: true, sortable: true },
  { key: 'date', label: 'Дата', visible: true, sortable: true },
  { key: 'pay_system_id', label: 'Плат. система', visible: false, sortable: true },
  { key: 'comment', label: 'Комментарий', visible: false, sortable: false },
];

const payModalFields: FieldConfig[] = [
  { key: 'id', label: 'ID', copyable: true },
  { key: 'user_id', label: 'ID пользователя', copyable: true, linkTo: '/users' },
  { key: 'money', label: 'Сумма' },
  { key: 'date', label: 'Дата', type: 'datetime' },
  { key: 'pay_system_id', label: 'Платёжная система' },
  { key: 'comment', label: 'Комментарий' },
];

function Pays() {
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
    let url = `/shm/v1/admin/user/pay?limit=${l}&offset=${o}`;
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
        <h2 className="text-xl font-bold">Платежи</h2>
        <Help content="<b>Платежи</b>: история платежей пользователей." />
      </div>
      <DataTable
        columns={payColumns}
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
        storageKey="pays"
      />
      <EntityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Платёж #${selectedRow?.id || ''}`}
        data={selectedRow}
        fields={payModalFields}
      />
    </div>
  );
}

export default Pays;
