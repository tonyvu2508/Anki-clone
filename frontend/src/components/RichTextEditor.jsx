import { useRef, useEffect } from 'react';
import './RichTextEditor.css';

function RichTextEditor({ value, onChange, placeholder = 'Enter text...' }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = () => {
    if (onChange && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const getSelection = () => {
    return window.getSelection();
  };

  const handleBold = () => execCommand('bold');
  const handleItalic = () => execCommand('italic');
  const handleUnderline = () => execCommand('underline');
  const handleStrikethrough = () => execCommand('strikeThrough');
  const handleUnorderedList = () => execCommand('insertUnorderedList');
  const handleOrderedList = () => execCommand('insertOrderedList');
  const handleLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const handleColor = (color) => {
    execCommand('foreColor', color);
  };

  const handleFontSize = (size) => {
    execCommand('fontSize', size);
  };

  const handleAlign = (align) => {
    execCommand('justify' + align);
  };

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar">
        <div className="toolbar-group">
          <button type="button" className="toolbar-btn" onClick={handleBold} title="Bold">
            <strong>B</strong>
          </button>
          <button type="button" className="toolbar-btn" onClick={handleItalic} title="Italic">
            <em>I</em>
          </button>
          <button type="button" className="toolbar-btn" onClick={handleUnderline} title="Underline">
            <u>U</u>
          </button>
          <button type="button" className="toolbar-btn" onClick={handleStrikethrough} title="Strikethrough">
            <s>S</s>
          </button>
        </div>
        <div className="toolbar-group">
          <select
            className="toolbar-select"
            onChange={(e) => handleFontSize(e.target.value)}
            title="Font Size"
          >
            <option value="">Size</option>
            <option value="1">Small</option>
            <option value="3">Normal</option>
            <option value="5">Large</option>
            <option value="7">Extra Large</option>
          </select>
          <input
            type="color"
            className="toolbar-color"
            onChange={(e) => handleColor(e.target.value)}
            title="Text Color"
          />
        </div>
        <div className="toolbar-group">
          <button type="button" className="toolbar-btn" onClick={handleUnorderedList} title="Bullet List">
            •
          </button>
          <button type="button" className="toolbar-btn" onClick={handleOrderedList} title="Numbered List">
            1.
          </button>
          <button type="button" className="toolbar-btn" onClick={handleLink} title="Insert Link">
            🔗
          </button>
        </div>
        <div className="toolbar-group">
          <button type="button" className="toolbar-btn" onClick={() => handleAlign('Left')} title="Align Left">
            ⬅
          </button>
          <button type="button" className="toolbar-btn" onClick={() => handleAlign('Center')} title="Align Center">
            ⬌
          </button>
          <button type="button" className="toolbar-btn" onClick={() => handleAlign('Right')} title="Align Right">
            ➡
          </button>
        </div>
      </div>
      <div
        ref={editorRef}
        className="rich-text-content"
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
}

export default RichTextEditor;

