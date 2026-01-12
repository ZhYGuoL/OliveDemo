import React, { useEffect, useRef } from 'react'
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

export const PromptEditor: React.FC<PromptEditorProps> = ({
  value,
  onChange,
  disabled,
  availableTables,
  placeholder = 'Ask a question...'
}) => {
  const availableTablesRef = useRef(availableTables)
  // Track if we are in a loading state (e.g. no tables available yet)
  // In a real app, you might pass an explict 'isLoading' prop
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
      // Note: TipTap's getText() usually separates blocks with newlines.
      // We might want to keep the HTML if we were doing rich text persistence,
      // but for this app, we just want the text with @mentions.
      // However, editor.getText() strips HTML tags.
      // The Mention node text is just the label (e.g., "@users").
      // So getText() returns "Show me @users" which is perfect.
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

  // Update available tables in suggestion options when they change
  // Note: We use a ref passed to getSuggestionOptions, so we don't need to reconfigure the extension
  // but we do need to ensure the ref is updated (handled above).
  useEffect(() => {
    if (editor && availableTables) {
       // No-op: Ref update handles it
    }
  }, [editor, availableTables])

  // Sync external value changes (e.g. clearing the input or setting from suggestions)
  useEffect(() => {
    if (editor && value !== editor.getText()) {
      // Only set content if it's materially different to avoid cursor jumping
      // This is a common issue with binding 'value' to an editor.
      // Usually better to let the editor drive the state, but 'value' is needed for external updates.
      editor.commands.setContent(value)
      // Move cursor to end of content
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
}

