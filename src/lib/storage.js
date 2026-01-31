
export function getStoredItems() {
    if (typeof localStorage === 'undefined') return [];

    const stored = localStorage.getItem('dataResidueItems');
    return stored ? JSON.parse(stored) : null;
}

export function saveItems(items) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('dataResidueItems', JSON.stringify(items));
    // Dispatch a custom event so the same tab can react if needed, 
    // though storage event covers cross-tab
    window.dispatchEvent(new Event('storage'));
}

export function addIncomingFile(file) {
    const currentItems = getStoredItems() || [];

    const newItem = {
        id: Date.now() + Math.random(),
        title: file.name,
        opened: false,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        size: file.size
    };

    const updatedItems = [newItem, ...currentItems];
    saveItems(updatedItems);
    return updatedItems;
}
