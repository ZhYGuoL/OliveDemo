import { ReactRenderer } from '@tiptap/react'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import { MentionList, MentionListRef } from './MentionList'
import { Editor } from '@tiptap/react'

interface SuggestionProps {
  editor: Editor
  query: string
  range: any
  clientRect?: (() => DOMRect | null) | null
  items: string[]
  command: (props: any) => void
  decorationNode: Element | null
  event?: KeyboardEvent
}

export const getSuggestionOptions = (itemsOrGetter: string[] | (() => string[]), _isLoading: boolean = false) => ({
  items: ({ query }: { query: string }) => {
    const items = typeof itemsOrGetter === 'function' ? itemsOrGetter() : itemsOrGetter
    console.log('Suggestion items - all:', items, 'query:', query)
    const filtered = items
      .filter(item => item.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 4)
    console.log('Suggestion items - filtered:', filtered)
    return filtered
  },

  render: () => {
    let component: ReactRenderer<MentionListRef>
    let popup: TippyInstance[]

    return {
      onStart: (props: SuggestionProps) => {
        const allItems = typeof itemsOrGetter === 'function' ? itemsOrGetter() : itemsOrGetter
        const loading = allItems.length === 0

        component = new ReactRenderer(MentionList, {
          props: { ...props, loading },
          editor: props.editor,
        })

        if (!props.clientRect) {
          return
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect as any,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate(props: SuggestionProps) {
        const allItems = typeof itemsOrGetter === 'function' ? itemsOrGetter() : itemsOrGetter
        const loading = allItems.length === 0

        component.updateProps({ ...props, loading })

        if (!props.clientRect) {
          return
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect as any,
        })
      },

      onKeyDown(props: { event: KeyboardEvent }) {
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }

        return component.ref?.onKeyDown(props) || false
      },

      onExit() {
        popup[0].destroy()
        component.destroy()
      },
    }
  },
})
