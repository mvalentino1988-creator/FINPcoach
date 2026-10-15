import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // Distance in pixels to trigger refresh
  disabled?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  disabled = false
}: UsePullToRefreshOptions) => {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false
  });

  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing) return;
    
    // Only trigger if at the top of the page
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
    }
  }, [disabled, state.isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || disabled || state.isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const distance = currentY.current - startY.current;

    // Only allow pulling down (positive distance)
    if (distance > 0) {
      e.preventDefault();
      
      // Apply resistance (make it harder to pull further)
      const resistedDistance = Math.min(distance * 0.4, threshold * 1.5);
      
      setState({
        isPulling: resistedDistance > threshold * 0.5,
        pullDistance: resistedDistance,
        isRefreshing: false
      });
    }
  }, [disabled, state.isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const { pullDistance, isPulling } = state;

    if (pullDistance >= threshold && isPulling) {
      // Trigger refresh
      setState({
        isPulling: false,
        pullDistance: 0,
        isRefreshing: true
      });

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh error:', error);
      }

      setState({
        isPulling: false,
        pullDistance: 0,
        isRefreshing: false
      });
    } else {
      // Reset without refreshing
      setState({
        isPulling: false,
        pullDistance: 0,
        isRefreshing: false
      });
    }
  }, [disabled, state, threshold, onRefresh]);

  useEffect(() => {
    if (disabled) return;

    const element = document;
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return state;
};
