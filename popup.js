"use strict";

// --- Constants & State ---
const BOOKMARKS_BAR_ID = '1';
const DEFAULT_ICON_URL = 'assets/default-icon.png';
const NESTED_FOLDER_COLORS = ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'];

let draggedElement = null; // The DOM element being dragged.

// --- Helper Functions ---
const getBookmarkId = (element) => element?.dataset.id || null;
const isFolder = (element) => element?.classList.contains('folder');
const isCollapseTile = (element) => element?.classList.contains('collapse-tile');

/**
 * Creates the inner content (icon and title) for a tile.
 * @param {chrome.bookmarks.BookmarkTreeNode} item The bookmark item.
 * @returns {DocumentFragment}
 */
function createTileContent(item) {
    const fragment = document.createDocumentFragment();
    const isBookmark = !!item.url;

    // Create Icon
    const icon = document.createElement(isBookmark ? "img" : "div");
    icon.className = `tile-icon ${isBookmark ? "favicon" : "folder-icon"}`;
    if (isBookmark) {
        icon.src = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(item.url)}&size=32`;
        icon.onerror = () => {
            icon.src = DEFAULT_ICON_URL;
        };
        icon.loading = "lazy";
    } else {
        const initials = (item.title || "F").replace(/^[^a-zA-Z0-9]+/, '').substring(0, 2).toUpperCase() || "F";
        icon.textContent = initials;
    }
    icon.title = item.title || "Untitled";
    fragment.appendChild(icon);

    // Create Title
    const title = document.createElement(isBookmark ? "a" : "span");
    title.className = "tile-title";
    title.textContent = item.title || item.url || "Unnamed Folder";
    if (isBookmark) {
        title.href = item.url;
        title.target = "_blank";
        title.rel = "noopener noreferrer";
    }
    fragment.appendChild(title);

    return fragment;
}

/**
 * Creates a generic tile element.
 * @param {chrome.bookmarks.BookmarkTreeNode} item The bookmark item.
 * @param {number} nestingLevel The depth of the item in the folder structure.
 * @returns {HTMLLIElement}
 */
function createTile(item, nestingLevel = 0) {
    const li = document.createElement("li");
    const isBookmark = !!item.url;
    li.className = `tile ${isBookmark ? 'bookmark' : 'folder'}`;
    li.dataset.id = item.id;
    li.draggable = true;

    if (!isBookmark && nestingLevel > 0) {
        li.classList.add('nested-folder');
        li.style.borderColor = NESTED_FOLDER_COLORS[(nestingLevel - 1) % NESTED_FOLDER_COLORS.length];
    }

    // Store data directly on the element for easy access
    li._itemData = item;
    li._nestingLevel = nestingLevel;

    li.appendChild(createTileContent(item));

    // Add delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-button";
    deleteBtn.innerHTML = "&times;";
    deleteBtn.title = `Delete ${item.title}`;
    deleteBtn.dataset.deleteId = item.id;
    deleteBtn.dataset.isFolder = !isBookmark;
    li.appendChild(deleteBtn);

    return li;
}

/**
 * Creates a "collapse" tile to close an open folder.
 * @param {HTMLLIElement} parentFolderEl The folder element this tile will collapse.
 * @returns {HTMLLIElement}
 */
function createCollapseTile(parentFolderEl) {
    const collapseLi = document.createElement("li");
    collapseLi.className = "tile collapse-tile";
    collapseLi.dataset.parentFolderId = getBookmarkId(parentFolderEl);
    collapseLi.dataset.collapseTargetId = getBookmarkId(parentFolderEl);

    collapseLi.innerHTML = `
    <div class="tile-icon collapse-icon" title="Collapse Folder">&lt;</div>
    <span class="tile-title collapse-title">Collapse</span>
  `;

    // Match the border color of the nested folder it belongs to
    if (parentFolderEl.classList.contains('nested-folder')) {
        collapseLi.classList.add('nested-collapse');
        collapseLi.style.borderColor = parentFolderEl.style.borderColor;
    }

    return collapseLi;
}

/**
 * Renders bookmarks into a container.
 * @param {chrome.bookmarks.BookmarkTreeNode[]} bookmarkNodes Array of bookmark items.
 * @param {HTMLElement} container The element to append children to.
 */
function displayBookmarks(bookmarkNodes, container) {
    if (!bookmarkNodes || bookmarkNodes.length === 0) {
        container.textContent = "The Bookmarks Bar is empty.";
        container.style.textAlign = 'center';
        container.style.padding = '20px';
        return;
    }
    bookmarkNodes.forEach(item => container.appendChild(createTile(item)));
}

/**
 * Fetches bookmarks and repopulates the entire list.
 */
async function refreshBookmarksList() {
    const list = document.getElementById("favorites-list");
    if (!list) return;

    list.innerHTML = ''; // Clear old content
    try {
        const bookmarkTree = await chrome.bookmarks.getTree();
        const bookmarksBar = bookmarkTree[0]?.children?.find(node => node.id === BOOKMARKS_BAR_ID);
        displayBookmarks(bookmarksBar?.children, list);
    } catch (error) {
        console.error("Error loading bookmarks:", error);
        list.textContent = "Error loading bookmarks.";
    }
}

// --- Folder Toggling ---

/**
 * Expands a folder to show its children.
 * @param {HTMLLIElement} folderEl The folder element to open.
 */
function openFolder(folderEl) {
    if (folderEl.classList.contains('open')) return;
    folderEl.classList.add('open');

    const children = folderEl._itemData.children || [];
    const nextNestingLevel = folderEl._nestingLevel + 1;
    const parentId = getBookmarkId(folderEl);

    const fragment = document.createDocumentFragment();
    const insertedElements = [];

    children.forEach(childItem => {
        const childEl = createTile(childItem, nextNestingLevel);
        childEl.dataset.parentFolderId = parentId;
        fragment.appendChild(childEl);
        insertedElements.push(childEl);
    });

    const collapseTile = createCollapseTile(folderEl);
    fragment.appendChild(collapseTile);
    insertedElements.push(collapseTile);

    folderEl.after(fragment);
    folderEl._insertedElements = insertedElements; // Track elements to remove on close
}

/**
 * Collapses a folder, hiding its children.
 * @param {HTMLLIElement} folderEl The folder element to close.
 */
function closeFolder(folderEl) {
    if (!folderEl.classList.contains('open')) return;
    folderEl.classList.remove('open');

    if (folderEl._insertedElements) {
        folderEl._insertedElements.forEach(el => {
            // Recursively close any subfolders before removing
            if (isFolder(el) && el.classList.contains('open')) {
                closeFolder(el);
            }
            el.remove();
        });
        delete folderEl._insertedElements;
    }
}


// --- Event Handlers ---
document.addEventListener('DOMContentLoaded', refreshBookmarksList);


document.getElementById('favorites-list').addEventListener('mousedown', (e) => {
    const tile = e.target.closest('.tile');
    if (!tile || draggedElement) return;

    // Handle Delete Button for any mouse button
    if (e.target.closest('.delete-button')) {
        e.stopPropagation();
        e.preventDefault(); // Prevent tile click from also firing
        const id = e.target.closest('[data-delete-id]').dataset.deleteId;
        const isFolderType = e.target.closest('[data-is-folder]').dataset.isFolder === 'true';
        const title = tile._itemData.title || (isFolderType ? 'folder' : 'bookmark');

        if (confirm(`Delete "${title}"?${isFolderType ? '\n(Folder and all contents will be removed!)' : ''}`)) {
            const removeAction = isFolderType ? chrome.bookmarks.removeTree : chrome.bookmarks.remove;
            removeAction(id, () => {
                if (chrome.runtime.lastError) {
                    alert(`Could not delete item: ${chrome.runtime.lastError.message}`);
                } else {
                    refreshBookmarksList();
                }
            });
        }
        return;
    }

    // Handle all other tile actions based on mouse button
    if (e.button === 0) { // Left-click
        if (isCollapseTile(tile)) {
            const targetId = tile.dataset.collapseTargetId;
            const folderToCollapse = document.querySelector(`.tile.folder[data-id='${targetId}']`);
            if (folderToCollapse) closeFolder(folderToCollapse);
        } else if (isFolder(tile)) {
            tile.classList.contains('open') ? closeFolder(tile) : openFolder(tile);
        } else if (!!tile._itemData.url) {
            const url = tile._itemData.url;
            chrome.tabs.update({
                url
            });
            window.close(); // Close the popup
        }
    } else if (e.button === 1) { // Middle-click
        e.preventDefault(); // Prevent browser's default middle-click behavior
        if (!!tile._itemData.url) {
            const url = tile._itemData.url;
            chrome.tabs.create({
                url
            });
        }
    }
});
document.getElementById('add-bookmark-btn').addEventListener('click', () => {
    const url = prompt("Enter bookmark URL:", "https://");
    if (!url || url.trim() === "https://") return;
    const title = prompt("Enter bookmark title (optional):", "");
    if (title === null) return; // User cancelled

    chrome.bookmarks.create({
        parentId: BOOKMARKS_BAR_ID,
        title: title.trim() || url,
        url
    }, () => {
        if (chrome.runtime.lastError) alert(`Error: ${chrome.runtime.lastError.message}`);
        else refreshBookmarksList();
    });
});

document.getElementById('add-folder-btn').addEventListener('click', () => {
    const title = prompt("Enter folder name:", "New Folder");
    if (!title) {
        if (title === "") alert("Folder name cannot be empty.");
        return;
    };

    chrome.bookmarks.create({
        parentId: BOOKMARKS_BAR_ID,
        title: title.trim()
    }, () => {
        if (chrome.runtime.lastError) alert(`Error: ${chrome.runtime.lastError.message}`);
        else refreshBookmarksList();
    });
});



const list = document.getElementById('favorites-list');

list.addEventListener('dragstart', (e) => {
    const target = e.target.closest('.tile');
    if (!target || !target.draggable || isCollapseTile(target)) {
        e.preventDefault();
        return;
    }
    draggedElement = target;
    e.dataTransfer.setData('text/plain', getBookmarkId(target));
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => target.classList.add('dragging'), 0);
});

list.addEventListener('dragend', (e) => {
    draggedElement?.classList.remove('dragging');
    draggedElement = null;
    document.querySelectorAll('.drag-over, .drag-over-folder').forEach(el => {
        el.classList.remove('drag-over', 'drag-over-folder');
    });
});

list.addEventListener('dragover', (e) => {
    e.preventDefault(); // Necessary to allow dropping
    const dropTarget = e.target.closest('.tile');

    document.querySelectorAll('.drag-over-folder').forEach(el => el.classList.remove('drag-over-folder'));

    if (!dropTarget || !draggedElement || dropTarget === draggedElement) return;

    dropTarget.classList.add('drag-over');

    if (isFolder(dropTarget) && getBookmarkId(dropTarget) !== getBookmarkId(draggedElement)) {
        dropTarget.classList.add('drag-over-folder');
    }
});

list.addEventListener('dragleave', (e) => {
    const target = e.target.closest('.tile');
    if (target && !target.contains(e.relatedTarget)) {
        target.classList.remove('drag-over', 'drag-over-folder');
    }
});

list.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const dropTarget = e.target.closest('.tile');
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || !draggedElement) return;

    const moveInfo = {
        parentId: undefined,
        index: undefined
    };

    if (dropTarget && dropTarget !== draggedElement) {
        const targetId = getBookmarkId(dropTarget);

        // Case 1: Drop INTO a folder
        if (isFolder(dropTarget) && dropTarget.classList.contains('drag-over-folder')) {
            moveInfo.parentId = targetId;
        }
        // Case 2: Reorder within a list
        else {
            moveInfo.parentId = dropTarget.dataset.parentFolderId || BOOKMARKS_BAR_ID;
            const siblings = [...dropTarget.parentElement.children].filter(c => c.tagName === 'LI' && c !== draggedElement);
            let targetIndex = siblings.indexOf(dropTarget);

            // Adjust index based on drop position (top half vs. bottom half of target)
            const rect = dropTarget.getBoundingClientRect();
            if (e.clientY > rect.top + rect.height / 2) {
                targetIndex++;
            }
            moveInfo.index = targetIndex;
        }
    } else if (!dropTarget) {
        // Case 3: Drop on empty space (append to that list)
        moveInfo.parentId = draggedElement.dataset.parentFolderId || BOOKMARKS_BAR_ID;
    } else {
        return; // Dropped on self, do nothing
    }

    // Execute the move
    chrome.bookmarks.move(draggedId, moveInfo, () => {
        if (chrome.runtime.lastError) {
            console.error(`Bookmark move error: ${chrome.runtime.lastError.message}`);
        }
        // Always refresh to ensure the UI is in sync with the bookmarks backend
        refreshBookmarksList();
    });
});