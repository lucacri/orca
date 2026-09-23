import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorPanelActionsMenu } from './EditorPanelActionsMenu'

const checkboxItems = vi.hoisted(() => ({
  list: [] as {
    checked?: boolean
    label: string
    onCheckedChange?: (checked: boolean) => void
  }[]
}))

vi.mock('@/components/ui/dropdown-menu', async () => {
  const React_ = await import('react')
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    React_.createElement(React_.Fragment, null, children)
  return {
    DropdownMenu: passthrough,
    DropdownMenuContent: passthrough,
    DropdownMenuItem: passthrough,
    DropdownMenuSeparator: () => null,
    DropdownMenuTrigger: passthrough,
    DropdownMenuCheckboxItem: ({
      checked,
      children,
      onCheckedChange
    }: {
      checked?: boolean
      children?: React.ReactNode
      onCheckedChange?: (checked: boolean) => void
    }) => {
      const label = React_.Children.toArray(children)
        .filter((child): child is string => typeof child === 'string')
        .join('')
      checkboxItems.list.push({ checked, label, onCheckedChange })
      return React_.createElement(React_.Fragment, null, children)
    }
  }
})

vi.mock('@/i18n/i18n', () => ({ translate: (_key: string, fallback: string) => fallback }))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: () => null
}))

describe('EditorPanelActionsMenu', () => {
  beforeEach(() => {
    checkboxItems.list = []
  })

  it('shows and binds Light Background only on non-diff markdown tabs', () => {
    const onToggleMarkdownPreviewLightBackground = vi.fn()
    const props = {
      isMarkdown: true,
      isDiffSurface: false,
      diffWordWrap: false,
      diffShowWhitespace: false,
      editorWordWrap: true,
      markdownPreviewLightBackground: true,
      shouldShowMarkdownExportAction: false,
      canExportMarkdownToPdf: false,
      canShowMarkdownFrontmatterToggle: false,
      markdownFrontmatterVisible: false,
      onToggleDiffWordWrap: () => {},
      onToggleDiffWhitespace: () => {},
      onToggleEditorWordWrap: () => {},
      onToggleMarkdownPreviewLightBackground,
      onToggleMarkdownFrontmatter: () => {},
      onExportMarkdownToPdf: () => {}
    }
    renderToStaticMarkup(React.createElement(EditorPanelActionsMenu, props))

    expect(checkboxItems.list).toHaveLength(2)
    expect(checkboxItems.list[1]).toMatchObject({ checked: true, label: 'Light Background' })
    checkboxItems.list[1]?.onCheckedChange?.(false)
    expect(onToggleMarkdownPreviewLightBackground).toHaveBeenCalledOnce()

    checkboxItems.list = []
    renderToStaticMarkup(
      React.createElement(EditorPanelActionsMenu, { ...props, isDiffSurface: true })
    )
    expect(checkboxItems.list.map((item) => item.label)).not.toContain('Light Background')
  })
})
