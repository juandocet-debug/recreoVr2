export class TableManager {
    constructor({ containerId, data, columns, actions, onEdit, onDelete, onDownload, rowIdField = 'id' }) {
        this.container = document.getElementById(containerId);
        this.originalData = data;
        this.filteredData = [...data];
        this.columns = columns;
        this.actions = actions || {}; // { edit: true, delete: true, download: false }
        this.onEdit = onEdit;
        this.onDelete = onDelete;
        this.onDownload = onDownload;
        this.rowIdField = rowIdField;

        // State
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.searchTerm = '';

        this.init();
    }

    init() {
        if (!this.container) return;
        // Clear container but keep table if it exists? No, let's rebuild structure
        // But we need to preserve the table element if it has specific IDs used by CSS?
        // Actually, the container is "dataSection" usually, but we want to target the table wrapper.
        // In current HTML, we have #dataSection -> #dataTable.
        // We should probably target the parent of #dataTable or replace #dataTable content.
        // Let's assume containerId is the ID of the DIV wrapping the table, e.g., 'dataSection' or a specific div.
        // If we pass 'dataSection', we might overwrite header.
        // Better to pass a specific container for the table area.
        // For now, let's assume the user will pass a container that SHOULD contain the controls and table.

        this.renderControls();
        this.renderTable();
    }

    updateData(newData) {
        this.originalData = newData;
        this.filterData();
    }

    filterData() {
        if (!this.searchTerm) {
            this.filteredData = [...this.originalData];
        } else {
            const term = this.searchTerm.toLowerCase();
            this.filteredData = this.originalData.filter(item => {
                return Object.values(item).some(val =>
                    String(val).toLowerCase().includes(term)
                );
            });
        }
        this.currentPage = 1;
        this.renderTable();
        this.renderPagination();
    }

    renderControls() {
        // Create controls container if not exists
        let controls = this.container.querySelector('.table-controls');
        if (!controls) {
            controls = document.createElement('div');
            controls.className = 'table-controls';
            controls.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:1rem;gap:1rem;flex-wrap:wrap;align-items:center;padding:0.5rem;background:#f8f9fa;border-radius:4px;';
            // Insert before the table
            const table = this.container.querySelector('table');
            if (table) {
                this.container.insertBefore(controls, table);
            } else {
                this.container.appendChild(controls);
            }
        }
        controls.innerHTML = '';

        // Search Input
        const searchWrapper = document.createElement('div');
        searchWrapper.style.flex = '1';
        searchWrapper.innerHTML = `
            <div class="input-group" style="display:flex;align-items:center;gap:0.5rem;">
                <i class="fas fa-search" style="color:#6c757d;"></i>
                <input type="text" class="form-control" placeholder="Buscar..." style="max-width:300px;padding:0.375rem 0.75rem;">
            </div>
        `;
        const input = searchWrapper.querySelector('input');
        input.value = this.searchTerm;
        input.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.filterData();
        });
        controls.appendChild(searchWrapper);

        // Export Button
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn-success btn-sm';
        exportBtn.innerHTML = '<i class="fas fa-file-excel"></i> Exportar Excel';
        exportBtn.onclick = () => this.exportToExcel();
        controls.appendChild(exportBtn);
    }

    renderTable() {
        let table = this.container.querySelector('table');
        if (!table) {
            table = document.createElement('table');
            table.className = 'table';
            table.id = 'dataTable'; // Maintain ID for CSS compatibility
            this.container.appendChild(table);
        }

        // Headers
        const thead = table.querySelector('thead') || document.createElement('thead');
        thead.innerHTML = `
            <tr>
                ${this.columns.map(col => `<th>${col.header}</th>`).join('')}
                ${Object.keys(this.actions).length ? '<th>Acciones</th>' : ''}
            </tr>
        `;
        if (!table.querySelector('thead')) table.appendChild(thead);

        // Body
        const tbody = table.querySelector('tbody') || document.createElement('tbody');
        tbody.innerHTML = '';

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageData = this.filteredData.slice(start, end);

        if (pageData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${this.columns.length + (Object.keys(this.actions).length ? 1 : 0)}" style="text-align:center;padding:2rem">No se encontraron registros</td></tr>`;
        } else {
            pageData.forEach(item => {
                const tr = document.createElement('tr');

                // Data Columns
                this.columns.forEach(col => {
                    const td = document.createElement('td');
                    if (col.render) {
                        td.innerHTML = col.render(item);
                    } else {
                        td.textContent = item[col.field] || '';
                    }
                    tr.appendChild(td);
                });

                // Actions Column
                if (Object.keys(this.actions).length) {
                    const td = document.createElement('td');
                    td.style.whiteSpace = 'nowrap';

                    if (this.actions.download) {
                        const btn = document.createElement('button');
                        btn.className = 'btn btn-info btn-sm';
                        btn.style.marginRight = '5px';
                        btn.innerHTML = '<i class="fas fa-file-pdf"></i>';
                        btn.title = 'Descargar PDF';
                        btn.onclick = () => this.onDownload(item[this.rowIdField]);
                        td.appendChild(btn);
                    }

                    if (this.actions.edit) {
                        const btn = document.createElement('button');
                        btn.className = 'btn btn-primary btn-sm edit-btn';
                        btn.style.marginRight = '5px';
                        btn.innerHTML = '<i class="fas fa-edit"></i>';
                        btn.onclick = () => this.onEdit(item[this.rowIdField]);
                        td.appendChild(btn);
                    }

                    if (this.actions.delete) {
                        const btn = document.createElement('button');
                        btn.className = 'btn btn-danger btn-sm delete-btn';
                        btn.innerHTML = '<i class="fas fa-trash"></i>';
                        btn.onclick = () => this.onDelete(item[this.rowIdField]);
                        td.appendChild(btn);
                    }
                    tr.appendChild(td);
                }
                tbody.appendChild(tr);
            });
        }
        if (!table.querySelector('tbody')) table.appendChild(tbody);

        this.renderPagination();
    }

    renderPagination() {
        let pagination = this.container.querySelector('.pagination-controls');
        if (!pagination) {
            pagination = document.createElement('div');
            pagination.className = 'pagination-controls';
            pagination.style.cssText = 'display:flex;justify-content:center;margin-top:1rem;gap:0.5rem;align-items:center;';
            this.container.appendChild(pagination);
        }
        pagination.innerHTML = '';

        const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        if (totalPages <= 1) return;

        // Prev
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-secondary btn-sm';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.onclick = () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderTable();
            }
        };
        pagination.appendChild(prevBtn);

        // Info
        const info = document.createElement('span');
        info.textContent = `Página ${this.currentPage} de ${totalPages}`;
        pagination.appendChild(info);

        // Next
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-secondary btn-sm';
        nextBtn.disabled = this.currentPage === totalPages;
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.onclick = () => {
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderTable();
            }
        };
        pagination.appendChild(nextBtn);
    }

    exportToExcel() {
        if (!window.XLSX) {
            alert('Librería XLSX no cargada. Por favor recargue la página.');
            return;
        }

        const exportData = this.filteredData.map(item => {
            const row = {};
            this.columns.forEach(col => {
                let value = item[col.field];
                if (col.renderText) {
                    value = col.renderText(item);
                } else if (col.render) {
                    const temp = document.createElement('div');
                    temp.innerHTML = col.render(item);
                    value = temp.textContent || temp.innerText || '';
                }
                row[col.header] = value;
            });
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Datos");
        XLSX.writeFile(wb, "exportacion_datos.xlsx");
    }
}
