import React, { useEffect, useState, useCallback } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import EntityModal, { FieldConfig } from '../components/EntityModal';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';

const promoColumns = [
  { key: 'id', label: 'Промокод', visible: true, sortable: true },
  { key: 'user_id', label: 'Создатель', visible: true, sortable: true },
  { key: 'template_id', label: 'Шаблон', visible: true, sortable: true },
  { key: 'created', label: 'Создан', visible: true, sortable: true },
  { key: 'expire', label: 'Истекает', visible: true, sortable: true },
  { key: 'used', label: 'Использован', visible: false, sortable: true },
  { key: 'used_by', label: 'Кем использован', visible: false, sortable: true },
];

const promoModalFields: FieldConfig[] = [
  { key: 'id', label: 'Промокод', copyable: true },
  { key: 'user_id', label: 'ID создателя', copyable: true, linkTo: '/users' },
  { key: 'template_id', label: 'ID шаблона', linkTo: '/templates' },
  { key: 'created', label: 'Создан', type: 'datetime' },
  { key: 'expire', label: 'Истекает', type: 'datetime' },
  { key: 'used', label: 'Использован', type: 'datetime' },
  { key: 'used_by', label: 'Кем использован', linkTo: '/users' },
];

function Promo() {
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
    let url = `/shm/v1/admin/promo?limit=${l}&offset=${o}`;
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
        <h2 className="text-xl font-bold">Промокоды</h2>
        <Help content="<b>Промокоды</b>: список промокодов. Можно создавать, удалять, смотреть кто использовал." />
      </div>
      <DataTable
        columns={promoColumns}
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
        storageKey="promo"
      />
      <EntityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Промокод: ${selectedRow?.id || ''}`}
        data={selectedRow}
        fields={promoModalFields}
      />
    </div>
  );
}

export default Promo;
