"use client";

import * as React from "react";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  useClientPoint,
} from "@floating-ui/react";

interface CustomTooltipProps {
  children: React.ReactElement;
  content: React.ReactNode;
}

export function CustomTooltip({ children, content }: CustomTooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset({ mainAxis: 10, crossAxis: 10 }),
      flip(),
      shift({ padding: 8 }),
    ],
  });

  const hover = useHover(context, { move: true });
  const clientPoint = useClientPoint(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    clientPoint,
    dismiss,
    role,
  ]);

  return (
    <>
      {React.cloneElement(
        children,
        getReferenceProps({ ref: refs.setReference, ...children.props })
      )}
      <FloatingPortal>
        {isOpen && (
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50 pointer-events-none"
          >
            <div className="bg-popover text-popover-foreground border border-border rounded-md px-3 py-1.5 text-xs shadow-md whitespace-nowrap">
              {content}
            </div>
          </div>
        )}
      </FloatingPortal>
    </>
  );
}
