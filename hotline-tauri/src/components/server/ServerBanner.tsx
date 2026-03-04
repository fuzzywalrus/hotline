interface ServerBannerProps {
  bannerUrl: string | null;
  serverName: string;
}

export default function ServerBanner({ bannerUrl, serverName }: ServerBannerProps) {
  return (
    <div className="bg-gray-900 dark:bg-black border-b border-gray-700 flex items-center justify-center py-2 px-4 h-[60px]">
      {bannerUrl && (
        <img
          src={bannerUrl}
          alt={`${serverName} Banner`}
          className="max-w-full h-auto max-h-[60px] object-contain"
          style={{ imageRendering: 'auto' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
    </div>
  );
}

