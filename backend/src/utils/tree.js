/**
 * Build tree structure from flat array of items
 * @param {Array} items - Flat array of items with parent references
 * @param {String|null} parentId - Parent ID to filter by (null for root)
 * @returns {Array} - Tree structure with children nested
 */
function buildTree(items, parentId = null) {
  return items
    .filter(item => {
      const itemParent = item.parent ? item.parent.toString() : null;
      return itemParent === parentId;
    })
    .sort((a, b) => a.order - b.order)
    .map(item => ({
      ...item.toObject(),
      children: buildTree(items, item._id.toString())
    }));
}

/**
 * Get full path from root to item
 * @param {Object} item - Item document
 * @param {Array} allItems - All items in deck (for lookup)
 * @returns {Array} - Array of items from root to current item
 */
function getItemPath(item, allItems) {
  const path = [item];
  let current = item;
  
  while (current.parent) {
    current = allItems.find(i => i._id.toString() === current.parent.toString());
    if (current) {
      path.unshift(current);
    } else {
      break;
    }
  }
  
  return path;
}

/**
 * Check if item is a leaf (has no children)
 * @param {String} itemId - Item ID
 * @param {Array} allItems - All items in deck
 * @returns {Boolean}
 */
function isLeafItem(itemId, allItems) {
  return !allItems.some(item => 
    item.parent && item.parent.toString() === itemId.toString()
  );
}

/**
 * Get all descendant item IDs (for cascade delete)
 * @param {String} itemId - Item ID
 * @param {Array} allItems - All items in deck
 * @returns {Array} - Array of descendant item IDs
 */
function getDescendantIds(itemId, allItems) {
  const descendants = [];
  const children = allItems.filter(item => 
    item.parent && item.parent.toString() === itemId.toString()
  );
  
  children.forEach(child => {
    descendants.push(child._id);
    descendants.push(...getDescendantIds(child._id, allItems));
  });
  
  return descendants;
}

module.exports = {
  buildTree,
  getItemPath,
  isLeafItem,
  getDescendantIds
};

