const RouteFallback = () => (
  <div
    role="status"
    aria-label="Loading"
    style={{
      minHeight: '40vh',
      display: 'grid',
      placeItems: 'center',
    }}
  >
    <div
      style={{
        width: 30,
        height: 30,
        border: '3px solid rgba(127, 127, 127, 0.25)',
        borderTopColor: 'currentColor',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  </div>
);

export default RouteFallback;
