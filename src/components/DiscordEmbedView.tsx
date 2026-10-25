import React from 'react';

interface DiscordEmbedProps {
  embed: {
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    footer?: { text: string; icon_url?: string };
    timestamp?: string;
    author?: { name: string; icon_url?: string };
  };
  isEphemeral?: boolean;
  botName?: string;
  botColor?: string;
}

export const DiscordEmbedView: React.FC<DiscordEmbedProps> = ({
  embed,
  isEphemeral = false,
  botName = 'Bot',
  botColor = '#5865F2'
}) => {
  // Convert decimal color to hex or default to Discord Blurple
  const hexColor = embed.color
    ? `#${embed.color.toString(16).padStart(6, '0')}`
    : botColor;

  return (
    <div className="relative group">
      {/* Ephemeral Notice Banner */}
      {isEphemeral && (
        <div className="flex items-center gap-2 mb-2 text-xs font-medium text-[#949ba4] bg-[#2b2d31]/80 border border-[#35373c] px-3 py-1.5 rounded-md">
          <svg className="w-3.5 h-3.5 text-[#5865f2]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span>Only you can see this</span>
          <span className="text-[#4e5058]">•</span>
          <span className="text-[#5865f2] hover:underline cursor-pointer">Dismiss message</span>
          <span className="ml-auto text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#1e1f22] rounded text-[#949ba4]">
            Megachannel Rule: Ephemeral
          </span>
        </div>
      )}

      {/* Main Discord Embed Card */}
      <div
        className="bg-[#2b2d31] rounded-r-lg rounded-l-[4px] border-l-4 text-[#dbdee1] p-4 text-sm max-w-2xl shadow-lg transition-all"
        style={{ borderLeftColor: hexColor }}
      >
        {/* Author */}
        {embed.author && (
          <div className="flex items-center gap-2 mb-2">
            {embed.author.icon_url && (
              <img src={embed.author.icon_url} alt="" className="w-5 h-5 rounded-full" />
            )}
            <span className="font-semibold text-xs text-white">{embed.author.name}</span>
          </div>
        )}

        {/* Title */}
        {embed.title && (
          <h4 className="font-bold text-white text-base mb-1.5 hover:underline cursor-pointer">
            {embed.title}
          </h4>
        )}

        {/* Description */}
        {embed.description && (
          <p className="text-[#dbdee1] text-xs leading-relaxed mb-3 whitespace-pre-line">
            {embed.description}
          </p>
        )}

        {/* Fields Grid */}
        {embed.fields && embed.fields.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
            {embed.fields.map((field, idx) => (
              <div
                key={idx}
                className={field.inline ? 'col-span-1' : 'col-span-full'}
              >
                <div className="text-[11px] font-bold text-[#b5bac1] uppercase tracking-wide mb-0.5">
                  {field.name}
                </div>
                <div className="text-xs text-[#dbdee1] leading-relaxed whitespace-pre-line bg-[#1e1f22]/60 p-2 rounded border border-[#35373c]/50">
                  {field.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer & Timestamp */}
        <div className="flex items-center gap-2 mt-3 pt-2 text-[10px] text-[#949ba4] border-t border-[#35373c]/60">
          {embed.footer?.icon_url && (
            <img src={embed.footer.icon_url} alt="" className="w-4 h-4 rounded-full" />
          )}
          <span>{embed.footer?.text || `${botName} • Club 602 & QNW`}</span>
          <span>•</span>
          <span>Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
};
