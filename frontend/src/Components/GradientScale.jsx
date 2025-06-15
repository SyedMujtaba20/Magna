import React from 'react';

const GradientScale = () => {
  return (
    <div style={{
      position: 'absolute',
      right: '20px',
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      padding: '20px 15px',
      border: '1px solid #444',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      <div style={{
        fontWeight: 'bold',
        marginBottom: '15px',
        color: '#ffffff',
        fontSize: '14px',
        textAlign: 'center'
      }}>
        Distance(m)
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '240px',
          fontSize: '12px',
          color: '#ffffff',
          textAlign: 'right',
          fontWeight: 'bold'
        }}>
          <span>7.00</span>
          <span>5.80</span>
          <span>4.60</span>
          <span>3.40</span>
          <span>2.20</span>
          <span>1.00</span>
        </div>

        <div style={{
          width: '24px',
          height: '240px',
          background: 'linear-gradient(to bottom, #FFC0CB 0%, #FF0000 20%, #FFFF00 40%, #00FF00 60%, #00BFFF 80%, #0000FF 100%)',
          border: '2px solid #333',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }} />
      </div>
    </div>
  );
};

export default GradientScale;
