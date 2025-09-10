const BankConnectButton = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Connect your bank</h2>
<p>Use this button to transfer all of your past trasactions from your bank automatically</p>
      <button
        className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        onClick={() => {
          const clientId = 'sandbox-moneymate-e874ec';
          const redirectUri = 'http://localhost:3000/redirect-page';
          const scope = 'info accounts balance transactions';
          const responseType = 'code';
          const provider = 'uk-ob-all';

          const authUrl = `https://auth.truelayer-sandbox.com/?response_type=code&client_id=sandbox-moneymate-e874ec&scope=transactions&redirect_uri=http://localhost:3000/callback&providers=uk-cs-mock%20uk-ob-all%20uk-oauth-all`;

          window.location.href = authUrl;
        }}
      >
        Connect Bank
      </button>
    </div>
  );
};

export default BankConnectButton;
