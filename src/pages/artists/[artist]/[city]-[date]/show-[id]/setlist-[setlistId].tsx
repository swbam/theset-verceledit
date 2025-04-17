import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import ShowDetail from '@/pages/ShowDetail';
import { parseShowUrl } from '@/lib/utils';

const ShowDetailPage = () => {
  const router = useRouter();
  const { asPath } = router;

  // Parse the URL to extract components
  const urlParams = parseShowUrl(asPath);

  // If URL parsing fails, show 404
  if (!urlParams) {
    return <div>Show not found</div>;
  }

  // Extract the show ID from the URL
  const { showId } = urlParams;

  return <ShowDetail id={showId} />;
};

export default ShowDetailPage;