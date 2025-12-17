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

export const getSuggestionOptions = (itemsOrGetter: string[] | (() => string[]) | (() => Promise<string[]>)) => ({
  items: async ({ query }: { query: string }) => {
    let items: string[] = []
    
    if (typeof itemsOrGetter === 'function') {
      const result = itemsOrGetter()
      if (result instanceof Promise) {
        items = await result
      } else {
        items = result
      }
    } else {
      items = itemsOrGetter
    }

    return items
      .filter(item => item.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 4)
  },

  render: () => {
    let component: ReactRenderer<MentionListRef>
    let popup: TippyInstance[]

    return {
      onStart: (props: SuggestionProps) => {
        // Since getSuggestionOptions items function is async,
        // TipTap calls onStart AFTER the items are resolved.
        // So we can't show a loading state here easily for the *initial* fetch
        // unless we modify how we provide items.
        // However, if we want to show skeletons *while* items are loading,
        // we might need to return a dummy loading state immediately or handle it in the component.
        
        // But TipTap's suggestion plugin awaits the items promise before calling onStart.
        // To show a loading state, we'd need to return "loading" items or similar hack,
        // OR rely on the fact that if items() is async, TipTap might delay showing.
        
        // Actually, for "local" filtering like we do, it's instant.
        // If the user means "while tables are loading from backend", that's different.
        // But the user said "while they are loading have skeleton loaders".
        
        // Assuming the user implies that `items` fetching might be slow (e.g. async call).
        // Since we changed `items` to support async in the previous turn (implied by the code I see),
        // let's assume `items` takes time.
        
        // However, standard TipTap suggestion awaits items.
        // To show loading, we can return a dummy list and flag it as loading?
        // Or simpler: The `MentionList` component can accept a `loading` prop.
        
        component = new ReactRenderer(MentionList, {
          props: { ...props, loading: false }, // We start with data ready because onStart is called after items resolve
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
        component.updateProps(props)

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
