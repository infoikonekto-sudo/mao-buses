export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #0D2B55 0%, #1A5FA8 100%)',
      color: 'white',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '4rem' }}>404</h1>
      <p style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Página no encontrada</p>
      <a href="/" style={{
        padding: '10px 20px',
        backgroundColor: '#F0C040',
        color: '#0D2B55',
        textDecoration: 'none',
        borderRadius: '8px',
        fontWeight: 'bold'
      }}>
        Volver al inicio
      </a>
    </div>
  );
}
