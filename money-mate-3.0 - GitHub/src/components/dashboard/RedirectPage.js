import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const RedirectPage = () => {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    console.log('Authorization code:', code); //see if the code is being grabbed 
    const error = params.get('error');

    if (error) {
      console.error('Authorization failed:', error);
      return;
    }

    if (code) {
      exchangeCodeForAccessToken(code);
    } else {
      console.error('No authorization code found in URL.');
    }
  }, [location]);

  const exchangeCodeForAccessToken = async (code) => {
    try {
      // Make a request to your backend to exchange the code for an access token
      const response = await fetch('http://localhost:5000/exchange-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code }),
      });
  
      const data = await response.json();
      if (data.access_token) {
        console.log('Access Token:', data.access_token);
        // You can now use the access token to fetch user data
      } else {
        console.error('Failed to get access token:', data);
      }
    } catch (error) {
      console.error('Error exchanging code for token:', error);
    }
  };

  return (
    <div className="p-6">
      <h2>Redirecting...</h2>
      <p>If you are not redirected, please check the console for errors.</p>
    </div>
  );
};

export default RedirectPage;
