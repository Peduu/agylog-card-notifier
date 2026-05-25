import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link as LinkIcon, Undo, Redo,
} from 'lucide-react'
import { useEffect } from 'react'

interface Props {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichEditor({ content, onChange, placeholder = 'Corpo do e-mail...' }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // Sync external content changes (e.g. loading a template)
  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content, false)
    }
  }, [content, editor])

  if (!editor) return null

  function toggleLink() {
    if (editor!.isActive('link')) {
      editor!.chain().focus().unsetLink().run()
    } else {
      const url = prompt('URL:')
      if (url) editor!.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div className="tiptap-wrapper">
      <div className="tiptap-toolbar">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''} title="Negrito">
          <Bold size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''} title="Itálico">
          <Italic size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'is-active' : ''} title="Sublinhado">
          <UnderlineIcon size={14} />
        </button>

        <div className="divider" />

        <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''} title="Esquerda">
          <AlignLeft size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''} title="Centro">
          <AlignCenter size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''} title="Direita">
          <AlignRight size={14} />
        </button>

        <div className="divider" />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''} title="Lista">
          <List size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''} title="Lista numerada">
          <ListOrdered size={14} />
        </button>

        <div className="divider" />

        <button type="button" onClick={toggleLink}
          className={editor.isActive('link') ? 'is-active' : ''} title="Link">
          <LinkIcon size={14} />
        </button>

        <div className="divider" />

        <button type="button" onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()} title="Desfazer">
          <Undo size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()} title="Refazer">
          <Redo size={14} />
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
