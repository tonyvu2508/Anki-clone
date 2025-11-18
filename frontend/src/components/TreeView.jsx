import { useState } from 'react';
import ItemNode from './ItemNode';

function TreeView({ items, deckId, onItemSelect, selectedItemId, onRefresh, readOnly = false }) {
  if (!items || items.length === 0) {
    return <div style={styles.empty}>No items yet. Create your first item!</div>;
  }

  return (
    <div style={styles.container}>
      {items.map(item => (
        <ItemNode
          key={item._id}
          item={item}
          deckId={deckId}
          level={0}
          onItemSelect={onItemSelect}
          selectedItemId={selectedItemId}
          onRefresh={onRefresh}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

const styles = {
  container: {
    padding: '1rem',
  },
  empty: {
    padding: '2rem',
    textAlign: 'center',
    color: '#666',
  },
};

export default TreeView;

