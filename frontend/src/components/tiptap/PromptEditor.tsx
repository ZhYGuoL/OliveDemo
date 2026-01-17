import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import { getSuggestionOptions } from './suggestion'
import './PromptEditor.css'

interface PromptEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  availableTables: string[]
  placeholder?: string
}

export interface PromptEditorRef {
  insertContentWithMentions: (text: string, tables: string[]) => void
}

export const PromptEditor = forwardRef<PromptEditorRef, PromptEditorProps>(({
  value,
  onChange,
  disabled,
  availableTables,
  placeholder = 'Ask a question...'
}, ref) => {
  const availableTablesRef = useRef(availableTables)
  // Track if we are in a loading state (e.g. no tables available yet)
  const isLoading = availableTables.length === 0

  // Keep ref in sync with prop
  useEffect(() => {
    availableTablesRef.current = availableTables
    console.log('PromptEditor: availableTables updated', availableTables)
  }, [availableTables])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention-pill',
        },
        suggestion: getSuggestionOptions(() => availableTablesRef.current, isLoading),
      }),
    ],
    content: value, // Set initial content
    onUpdate: ({ editor }: { editor: Editor }) => {
      // Get text content to send back to parent
      const text = editor.getText()
      onChange(text)
    },
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'prompt-editor-input',
      },
    },
  })

  // Expose method to insert content with mentions
  useImperativeHandle(ref, () => ({
    insertContentWithMentions: (text: string, tables: string[]) => {
      if (!editor) return

      // Build content with mention nodes
      const content: any[] = []

      // Add the text first
      if (text) {
        content.push({
          type: 'paragraph',
          content: [{ type: 'text', text }]
        })
      }

      // Add a paragraph with table mentions if any
      if (tables && tables.length > 0) {
        const mentionContent: any[] = [{ type: 'text', text: 'Tables: ' }]
        tables.forEach((table, index) => {
          if (index > 0) {
            mentionContent.push({ type: 'text', text: ', ' })
          }
          mentionContent.push({
            type: 'mention',
            attrs: { id: table, label: table }
          })
        })
        content.push({
          type: 'paragraph',
          content: mentionContent
        })
      }

      editor.commands.setContent({ type: 'doc', content })
      editor.commands.focus('end')
    }
  }), [editor])

  // Update available tables in suggestion options when they change
  useEffect(() => {
    if (editor && availableTables) {
       // No-op: Ref update handles it
    }
  }, [editor, availableTables])

  // Sync external value changes (e.g. clearing the input or setting from suggestions)
  useEffect(() => {
    if (editor && value !== editor.getText()) {
      editor.commands.setContent(value)
      editor.commands.focus('end')
    }
  }, [editor, value])

  if (!editor) {
    return null
  }

  // Workaround for TypeScript error with EditorContent
  const EditorContentAny = EditorContent as any

  return (
    <div className="prompt-editor-wrapper">
      <EditorContentAny editor={editor} />
    </div>
  )
})

