export async function getAccessToken() {
  const tenantId = process.env.ONEDRIVE_TENANT_ID || 'common';
  const clientId = process.env.ONEDRIVE_CLIENT_ID || '';
  const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET || '';
  const refreshToken = process.env.ONEDRIVE_REFRESH_TOKEN || '';

  if (!refreshToken || !clientId) {
    console.error('Missing OneDrive credentials in .env');
    return null;
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  if (clientSecret) {
    params.append('client_secret', clientSecret);
  }
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Error refreshing OneDrive token:', data);
      return null;
    }
    return data.access_token;
  } catch (error) {
    console.error('Error fetching OneDrive token:', error);
    return null;
  }
}

export async function uploadToOneDrive(file: File): Promise<string> {
  try {
    const token = await getAccessToken();
    if (!token) return '';

    const fileName = file.name || 'upload.jpg';
    const url = `https://graph.microsoft.com/v1.0/me/drive/root:/App_Uploads/${fileName}:/content`;
    const arrayBuffer = await file.arrayBuffer();

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: arrayBuffer
    });

    if (!response.ok) {
      console.error('Graph API Error:', await response.text());
      return '';
    }

    return `/api/proxy-image/${fileName}`;
  } catch (error) {
    console.error('Unexpected Error during upload:', error);
    return '';
  }
}
