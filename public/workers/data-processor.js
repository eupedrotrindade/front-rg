// Web Worker para processamento de dados pesados
// Este worker roda em thread separada para não bloquear a UI

// Função para formatação de CPF
function formatCPF(cpf) {
    if (!cpf) return "";
    const trimmedCpf = cpf.trim();
    if (!trimmedCpf) return "";
    const digits = trimmedCpf.replace(/\D/g, "");
    if (digits.length !== 11) return trimmedCpf;
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// Função para filtrar e ordenar dados
function processData({ 
    data, 
    filters, 
    selectedDay, 
    advancedFilters, 
    sorting, 
    columnFilters,
    credentials 
}) {
    let filtered = [...data];

    // Filtrar por dia selecionado
    if (selectedDay && selectedDay !== 'all') {
        const dayData = selectedDay.includes('_') ? selectedDay.split('_')[1] : selectedDay;
        filtered = filtered.filter(item => {
            if (!item.daysWork || item.daysWork.length === 0) return false;
            return item.daysWork.includes(dayData);
        });
    }

    // Aplicar filtros básicos
    filtered = filtered.filter(item => {
        const nameMatch = item.name?.toLowerCase().includes(filters.nome.toLowerCase());
        
        const cpfTrimmed = item.cpf?.trim() || "";
        const cpfDigits = cpfTrimmed.replace(/\D/g, "");
        const searchDigits = filters.nome.replace(/\D/g, "");
        const cpfMatch = (
            cpfTrimmed === filters.nome ||
            (cpfDigits && searchDigits && cpfDigits === searchDigits) ||
            (searchDigits.length >= 3 && cpfDigits?.includes(searchDigits))
        );
        
        const credentialMatch = item.credentialId?.toLowerCase() === filters.nome.toLowerCase();
        const companyMatch = filters.empresa ? item.company === filters.empresa : true;
        const roleMatch = filters.funcao ? item.role === filters.funcao : true;

        return (nameMatch || cpfMatch || credentialMatch) && companyMatch && roleMatch;
    });

    // Aplicar filtros avançados
    Object.entries(advancedFilters).forEach(([campo, valor]) => {
        if (valor && String(valor).trim() !== "") {
            filtered = filtered.filter(item => {
                const itemValue = item[campo];
                return itemValue !== undefined && 
                       String(itemValue).toLowerCase() === String(valor).toLowerCase();
            });
        }
    });

    // Aplicar filtros das colunas
    if (columnFilters) {
        // Filtro de nome
        if (columnFilters.nome && columnFilters.nome.length > 0) {
            filtered = filtered.filter(item => 
                columnFilters.nome.includes(item.name || '')
            );
        }

        // Filtro de CPF
        if (columnFilters.cpf && columnFilters.cpf.length > 0) {
            filtered = filtered.filter(item => {
                const formattedCpf = formatCPF(item.cpf?.trim() || '');
                return columnFilters.cpf.includes(formattedCpf);
            });
        }

        // Filtro de função
        if (columnFilters.funcao && columnFilters.funcao.length > 0) {
            filtered = filtered.filter(item => 
                columnFilters.funcao.includes(item.role || '')
            );
        }

        // Filtro de empresa
        if (columnFilters.empresa && columnFilters.empresa.length > 0) {
            filtered = filtered.filter(item => 
                columnFilters.empresa.includes(item.company || '')
            );
        }

        // Filtro de credencial
        if (columnFilters.credencial && columnFilters.credencial.length > 0) {
            filtered = filtered.filter(item => {
                const credential = credentials.find(c => c.id === item.credentialId);
                const credentialName = credential?.nome || 'SEM CREDENCIAL';
                return columnFilters.credencial.includes(credentialName);
            });
        }
    }

    // Aplicar ordenação
    if (sorting && sorting.campo) {
        filtered.sort((a, b) => {
            let aVal, bVal;

            switch (sorting.campo) {
                case 'name':
                    aVal = a.name ?? '';
                    bVal = b.name ?? '';
                    break;
                case 'cpf':
                    aVal = formatCPF(a.cpf?.trim() || '');
                    bVal = formatCPF(b.cpf?.trim() || '');
                    break;
                case 'role':
                    aVal = a.role ?? '';
                    bVal = b.role ?? '';
                    break;
                case 'company':
                    aVal = a.company ?? '';
                    bVal = b.company ?? '';
                    // Normalizar para comparação
                    aVal = typeof aVal === 'string' ? 
                        aVal.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim() : '';
                    bVal = typeof bVal === 'string' ? 
                        bVal.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim() : '';
                    break;
                case 'credentialId':
                    const credentialA = credentials.find(c => c.id === a.credentialId);
                    const credentialB = credentials.find(c => c.id === b.credentialId);
                    aVal = credentialA?.nome || 'SEM CREDENCIAL';
                    bVal = credentialB?.nome || 'SEM CREDENCIAL';
                    break;
                default:
                    aVal = a[sorting.campo] ?? '';
                    bVal = b[sorting.campo] ?? '';
            }

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sorting.direcao === 'asc' ? 
                    aVal.localeCompare(bVal) : 
                    bVal.localeCompare(aVal);
            }
            return 0;
        });
    }

    return filtered;
}

// Função para calcular valores únicos para filtros
function calculateUniqueValues(data, credentials) {
    const unique = {
        nome: [...new Set(data.map(c => c.name).filter(Boolean))],
        cpf: [...new Set(data.map(c => formatCPF(c.cpf?.trim() || '')).filter(Boolean))],
        funcao: [...new Set(data.map(c => c.role).filter(Boolean))],
        empresa: [...new Set(data.map(c => c.company).filter(Boolean))],
        credencial: [...new Set(data.map(c => {
            const credential = credentials.find(w => w.id === c.credentialId);
            return credential?.nome || 'SEM CREDENCIAL';
        }))]
    };
    
    return unique;
}

// Função para indexar dados para busca rápida
function buildSearchIndex(data, fields) {
    const index = new Map();
    
    data.forEach((item, idx) => {
        fields.forEach(field => {
            const fieldValue = item[field];
            if (fieldValue == null) return;
            
            const words = String(fieldValue)
                .toLowerCase()
                .split(/\s+/)
                .filter(word => word.length >= 2);
            
            words.forEach(word => {
                if (!index.has(word)) {
                    index.set(word, new Set());
                }
                index.get(word).add(idx);
            });
        });
    });
    
    return Object.fromEntries(index);
}

// Função para busca indexada
function indexedSearch(data, searchIndex, term) {
    if (!term || term.length < 2) return data;
    
    const words = term.toLowerCase().split(/\s+/).filter(word => word.length >= 2);
    if (!words.length) return data;
    
    let resultIndices = null;
    
    words.forEach(word => {
        const indices = searchIndex[word] ? new Set(searchIndex[word]) : new Set();
        
        if (resultIndices === null) {
            resultIndices = indices;
        } else {
            // Intersecção
            resultIndices = new Set([...resultIndices].filter(i => indices.has(i)));
        }
    });
    
    if (!resultIndices || !resultIndices.size) return [];
    
    return Array.from(resultIndices)
        .map(index => data[index])
        .filter(Boolean);
}

// Event listener para mensagens do thread principal
self.addEventListener('message', (e) => {
    const { type, data, id } = e.data;
    
    try {
        let result;
        
        switch (type) {
            case 'PROCESS_DATA':
                result = processData(data);
                break;
                
            case 'CALCULATE_UNIQUE_VALUES':
                result = calculateUniqueValues(data.data, data.credentials);
                break;
                
            case 'BUILD_SEARCH_INDEX':
                result = buildSearchIndex(data.data, data.fields);
                break;
                
            case 'INDEXED_SEARCH':
                result = indexedSearch(data.data, data.searchIndex, data.term);
                break;
                
            default:
                throw new Error(`Tipo de operação desconhecido: ${type}`);
        }
        
        // Enviar resultado de volta
        self.postMessage({
            type: `${type}_RESULT`,
            result,
            id
        });
        
    } catch (error) {
        // Enviar erro de volta
        self.postMessage({
            type: `${type}_ERROR`,
            error: error.message,
            id
        });
    }
});