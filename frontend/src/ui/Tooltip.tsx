import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import './Tooltip.css';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
}

/**
 * Accessible tooltip wrapper. Content is announced via aria-describedby by
 * Radix, and keyboard focus opens it as well as hover.
 */
const Tooltip: React.FC<TooltipProps> = ({ content, children, side = 'top', delay = 350 }) => (
  <TooltipPrimitive.Provider delayDuration={delay} skipDelayDuration={200}>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content className="ui-tooltip" side={side} sideOffset={6}>
          {content}
          <TooltipPrimitive.Arrow className="ui-tooltip__arrow" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>
);

export default Tooltip;
