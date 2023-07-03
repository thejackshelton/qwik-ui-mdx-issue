import {
  component$,
  useContext,
  useId,
  Slot,
  useComputed$,
  useTask$,
  $,
  useSignal,
  QwikIntrinsicElements,
} from "@builder.io/qwik";
import { tabsContextId } from "./tabs-context-id";
import { type KeyCode } from "../../utils/key-code.type";
import { isBrowser, isServer } from "@builder.io/qwik/build";

// test

export type TabProps = {
  class?: string;
  selectedClassName?: string;
  disabled?: boolean;
} & QwikIntrinsicElements["button"];

export const Tab = component$((props: TabProps) => {
  const contextService = useContext(tabsContextId);

  const serverAssignedIndexSig = useSignal<number | undefined>(undefined);
  const uniqueId = useId();

  useTask$(({ cleanup }) => {
    if (isServer) {
      serverAssignedIndexSig.value =
        contextService.lastAssignedTabIndexSig.value;
      contextService.lastAssignedTabIndexSig.value++;
    }
    if (isBrowser) {
      contextService.onTabsChanged$();
    }
    cleanup(() => {
      contextService.onTabsChanged$();
    });
  });

  useTask$(({ track }) => {
    track(() => props.disabled);

    if (props.disabled && contextService.tabsMap[uniqueId]) {
      contextService.tabsMap[uniqueId].disabled = true;
    }
  });

  const isSelectedSignal = useComputed$(() => {
    if (isServer) {
      return (
        serverAssignedIndexSig.value === contextService.selectedIndexSig.value
      );
    }
    return (
      contextService.selectedIndexSig.value ===
      contextService.tabsMap[uniqueId]?.index
    );
  });

  const matchedTabPanelId = useComputed$(
    () => contextService.tabsMap[uniqueId]?.tabPanelId
  );

  const selectTab$ = $(() => {
    // TODO: try to move this to the Tabs component

    if (props.disabled) {
      return;
    }
    contextService.selectedIndexSig.value =
      contextService.tabsMap[uniqueId]?.index || 0;

    contextService.selectTab$(uniqueId);
  });

  const selectIfAutomatic$ = $(() => {
    if (contextService.behavior === "automatic") {
      selectTab$();
    }
  });

  return (
    <button
      id={"tab-" + uniqueId}
      data-tab-id={uniqueId}
      type='button'
      role='tab'
      disabled={props.disabled}
      aria-disabled={props.disabled}
      onFocus$={selectIfAutomatic$}
      onMouseEnter$={selectIfAutomatic$}
      aria-selected={isSelectedSignal.value}
      tabIndex={isSelectedSignal.value ? 0 : -1}
      aria-controls={"tabpanel-" + matchedTabPanelId.value}
      class={`${
        isSelectedSignal.value
          ? `selected ${props.selectedClassName || ""}`
          : ""
      }${props.class ? ` ${props.class}` : ""}`}
      onClick$={[
        $(() => {
          selectTab$();
        }),
        props.onClick$,
      ]}
      onKeyDown$={(e) => {
        contextService.onTabKeyDown$(
          e.key as KeyCode,
          (e.target as any).getAttribute("data-tab-id")
        );
      }}
    >
      <Slot />
    </button>
  );
});
