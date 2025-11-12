import type { BotInboundContent, BotContent } from '@igniter-js/bot';
import type { UIMessagePart } from 'ai';

/**
 * Type guard to check if content is inbound (received by bot)
 */
function isInboundContent(content: BotContent): content is BotInboundContent {
  return content.type !== 'interactive' && content.type !== 'reply';
}

/**
 * Converts a Telegram bot message content to AI SDK UIMessage format.
 * Supports text, images, videos, audio, documents, and other content types.
 * 
 * @param content - The bot content from Telegram adapter
 * @param attachments - Optional attachments array from the bot context
 * @returns Array of UIMessage parts compatible with AI SDK
 */
export function convertBotContentToUIMessage(
  content: BotContent | undefined,
  attachments?: Array<{ name?: string; type?: string; content?: string }>
): UIMessagePart<any, any>[] {
  if (!content || !isInboundContent(content)) {
    return [];
  }

  const parts: UIMessagePart<any, any>[] = [];

  switch (content.type) {
    case 'text': {
      parts.push({
        type: 'text',
        text: content.content,
      });
      break;
    }

    case 'command': {
      // Commands are converted to text format: "/command arg1 arg2"
      parts.push({
        type: 'text',
        text: content.raw || `/${content.command}${content.params.length > 0 ? ' ' + content.params.join(' ') : ''}`,
      });
      break;
    }

    case 'image': {
      // Convert base64 to data URL if needed
      const imageUrl = content.content.startsWith('data:')
        ? content.content
        : content.content.startsWith('http')
        ? content.content
        : `data:image/jpeg;base64,${content.content}`;

      parts.push({
        type: 'file',
        url: imageUrl,
        mediaType: content.file?.type || 'image/jpeg',
        filename: content.file?.name || 'image.jpg',
      });

      // Add caption as text if present
      if (content.caption) {
        parts.push({
          type: 'text',
          text: content.caption,
        });
      }
      break;
    }

    case 'video': {
      // Convert base64 to data URL if needed
      const videoUrl = content.content.startsWith('data:')
        ? content.content
        : content.content.startsWith('http')
        ? content.content
        : `data:video/mp4;base64,${content.content}`;

      parts.push({
        type: 'file',
        url: videoUrl,
        mediaType: content.file?.type || 'video/mp4',
        filename: content.file?.name || 'video.mp4',
      });

      // Add caption as text if present
      if (content.caption) {
        parts.push({
          type: 'text',
          text: content.caption,
        });
      }
      break;
    }

    case 'audio': {
      // Convert base64 to data URL if needed
      const audioUrl = content.content.startsWith('data:')
        ? content.content
        : content.content.startsWith('http')
        ? content.content
        : `data:${content.mimeType || 'audio/mpeg'};base64,${content.content}`;

      parts.push({
        type: 'file',
        url: audioUrl,
        mediaType: content.mimeType || content.file?.type || 'audio/mpeg',
        filename: content.file?.name || 'audio.mp3',
      });
      break;
    }

    case 'document': {
      // Convert base64 to data URL if needed
      const documentUrl = content.content.startsWith('data:')
        ? content.content
        : content.content.startsWith('http')
        ? content.content
        : `data:${content.mimeType || 'application/octet-stream'};base64,${content.content}`;

      parts.push({
        type: 'file',
        url: documentUrl,
        mediaType: content.mimeType || content.file?.type || 'application/octet-stream',
        filename: content.filename || content.file?.name || 'document',
      });

      // Add caption as text if present
      if (content.caption) {
        parts.push({
          type: 'text',
          text: content.caption,
        });
      }
      break;
    }

    case 'sticker': {
      // Stickers are treated as images
      const stickerUrl = content.content.startsWith('data:')
        ? content.content
        : content.content.startsWith('http')
        ? content.content
        : `data:image/webp;base64,${content.content}`;

      parts.push({
        type: 'file',
        url: stickerUrl,
        mediaType: content.file?.type || 'image/webp',
        filename: content.file?.name || 'sticker.webp',
      });
      break;
    }

    case 'location': {
      // Location is converted to text description
      const locationText = content.name || content.address
        ? `📍 Location: ${content.name || ''}${content.address ? ` - ${content.address}` : ''}\nCoordinates: ${content.latitude}, ${content.longitude}`
        : `📍 Location: ${content.latitude}, ${content.longitude}`;

      parts.push({
        type: 'text',
        text: locationText,
      });
      break;
    }

    case 'contact': {
      // Contact is converted to text description
      const contactText = `📞 Contact: ${content.firstName}${content.lastName ? ` ${content.lastName}` : ''}\nPhone: ${content.phoneNumber}`;

      parts.push({
        type: 'text',
        text: contactText,
      });
      break;
    }

    case 'poll': {
      // Poll is converted to text description
      const pollText = `📊 Poll: ${content.question}\n${content.options.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n')}`;

      parts.push({
        type: 'text',
        text: pollText,
      });
      break;
    }

    case 'callback': {
      // Callback queries are converted to text
      parts.push({
        type: 'text',
        text: `Callback: ${content.data}`,
      });
      break;
    }

    default: {
      // Fallback: convert to text description
      parts.push({
        type: 'text',
        text: `[Unsupported content type: ${(content as any).type}]`,
      });
    }
  }

  // Add attachments if provided and not already processed
  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      // Check if this attachment was already processed as part of content
      const alreadyProcessed = parts.some(
        part => part.type === 'file' && part.filename === attachment.name
      );

      if (!alreadyProcessed && attachment.content) {
        const mediaType = attachment.type || 'application/octet-stream';
        const attachmentUrl = attachment.content.startsWith('data:')
          ? attachment.content
          : `data:${mediaType};base64,${attachment.content}`;

        parts.push({
          type: 'file',
          url: attachmentUrl,
          mediaType: mediaType,
          filename: attachment.name || 'attachment',
        });
      }
    }
  }

  return parts;
}

/**
 * Converts a complete bot message context to AI SDK UIMessage format.
 * 
 * @param messageId - Unique message ID
 * @param role - Message role ('user' | 'assistant')
 * @param content - The bot content from Telegram adapter
 * @param attachments - Optional attachments array from the bot context
 * @returns UIMessage compatible object
 */
export function convertBotMessageToUIMessage(
  messageId: string,
  role: 'user' | 'assistant',
  content: BotInboundContent | undefined,
  attachments?: Array<{ name?: string; type?: string; content?: string }>
) {
  return {
    id: messageId,
    role,
    parts: convertBotContentToUIMessage(content, attachments),
  };
}

