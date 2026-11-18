/**
 * INVITE STUDIO - UNIVERSAL LUXURY INVITATION CARD GENERATOR
 *
 * Renders a high-resolution, print-ready digital luxury invitation card on an HTML5 canvas.
 * Perfectly calibrated with the Universal Luxury Invitation design system:
 * - Dimensions: 1200 x 800 (high-DPI 3:2 aspect ratio for WhatsApp previews & downloads)
 * - Warm Ivory (#F8F3EB), Champagne Gold (#D8B66E), Deep Burgundy (#401526)
 * - Complete dynamic metadata: Event Title, Guest Name, Host Name, Date, Time, Venue, Monogram Seal
 */

export interface InvitationCardOptions {
  eventName: string;
  eventType?: string | null;
  guestName?: string | null;
  hostName?: string | null;
  eventDate: string | Date;
  eventTime?: string | null;
  venue: string;
}

function getEventEyebrow(eventType?: string | null, eventName?: string): string {
  const type = (eventType || '').toUpperCase();
  const name = (eventName || '').toLowerCase();

  if (type === 'WEDDING' || name.includes('wedding') || name.includes('shaadi') || name.includes('vivah')) {
    return 'A CELEBRATION OF LOVE';
  }
  if (type === 'ANNIVERSARY' || name.includes('anniversary') || name.includes('silver jubilee') || name.includes('jubilee')) {
    return 'CELEBRATING YEARS OF TOGETHERNESS';
  }
  if (type === 'BIRTHDAY' || name.includes('birthday')) {
    return 'A JOYOUS CELEBRATION';
  }
  if (type === 'CORPORATE' || name.includes('gala') || name.includes('summit') || name.includes('conference')) {
    return 'CORDIALLY INVITED';
  }
  if (type === 'HOUSEWARMING' || name.includes('housewarming') || name.includes('griha pravesh')) {
    return 'CELEBRATING A NEW BEGINNING';
  }
  return 'CORDIALLY INVITED';
}

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Creates the canvas and renders the luxury invitation card.
 */
export async function renderInvitationCardCanvas(
  options: InvitationCardOptions
): Promise<HTMLCanvasElement> {
  const width = 1200;
  const height = 800;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas 2d context');

  // 1. Warm Luxury Ivory Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#FAF6F0');
  bgGrad.addColorStop(0.5, '#F8F3EB');
  bgGrad.addColorStop(1, '#F3EAE0');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Soft subtle vignette overlay
  const radialVignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    200,
    width / 2,
    height / 2,
    700
  );
  radialVignette.addColorStop(0, 'rgba(255, 253, 252, 0.4)');
  radialVignette.addColorStop(1, 'rgba(64, 21, 38, 0.04)');
  ctx.fillStyle = radialVignette;
  ctx.fillRect(0, 0, width, height);

  // 2. Inset Double Gold Borders
  ctx.strokeStyle = '#D8B66E';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(32, 32, width - 64, height - 64);

  ctx.strokeStyle = 'rgba(216, 182, 110, 0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(44, 44, width - 88, height - 88);

  // 3. Corner Diamond Accents
  ctx.fillStyle = '#D8B66E';
  const cornerInset = 44;
  drawDiamond(ctx, cornerInset, cornerInset, 8);
  drawDiamond(ctx, width - cornerInset, cornerInset, 8);
  drawDiamond(ctx, cornerInset, height - cornerInset, 8);
  drawDiamond(ctx, width - cornerInset, height - cornerInset, 8);

  // 4. Header Seal & Monogram
  const sealY = 92;
  ctx.save();
  ctx.beginPath();
  ctx.arc(width / 2, sealY, 26, 0, Math.PI * 2);
  ctx.fillStyle = '#401526';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#D8B66E';
  ctx.stroke();

  // "I" monogram inside seal
  ctx.fillStyle = '#D8B66E';
  ctx.font = 'italic 26px "Playfair Display", Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('I', width / 2, sealY + 1);
  ctx.restore();

  // Branding text
  ctx.textAlign = 'center';
  ctx.fillStyle = '#34232B';
  ctx.font = '600 11px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '5px';
  ctx.fillText('INVITE STUDIO', width / 2, 134);

  ctx.fillStyle = '#B8944F';
  ctx.font = '500 9px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '3.5px';
  ctx.fillText('LUXE CELEBRATIONS', width / 2, 149);

  // 5. Ornamental Gold Divider
  ctx.strokeStyle = 'rgba(216, 182, 110, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 120, 172);
  ctx.lineTo(width / 2 - 16, 172);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width / 2 + 16, 172);
  ctx.lineTo(width / 2 + 120, 172);
  ctx.stroke();

  ctx.fillStyle = '#D8B66E';
  drawDiamond(ctx, width / 2, 172, 6);

  // 6. Eyebrow Badge Pill
  const eyebrow = getEventEyebrow(options.eventType, options.eventName);
  ctx.font = '600 10.5px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '3px';
  const eyebrowWidth = ctx.measureText(eyebrow).width + 36;
  const eyebrowHeight = 24;
  const pillY = 196;

  ctx.save();
  ctx.beginPath();
  // Rounded pill
  const pillX = width / 2 - eyebrowWidth / 2;
  ctx.roundRect(pillX, pillY, eyebrowWidth, eyebrowHeight, 12);
  ctx.fillStyle = '#FAF4EC';
  ctx.fill();
  ctx.strokeStyle = 'rgba(216, 182, 110, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#5C2032';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(eyebrow, width / 2, pillY + eyebrowHeight / 2 + 1);
  ctx.restore();

  // 7. Event Title
  ctx.fillStyle = '#401526';
  ctx.font = 'normal 40px "Playfair Display", Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '0px';

  const titleLines = wrapText(ctx, options.eventName, 940);
  let currentY = 268;
  const lineHeight = 46;
  titleLines.slice(0, 2).forEach((line) => {
    ctx.fillText(line, width / 2, currentY);
    currentY += lineHeight;
  });

  // 8. Guest Greeting
  ctx.fillStyle = '#887A78';
  ctx.font = 'italic 17px "Playfair Display", Georgia, serif';
  ctx.textAlign = 'center';
  const greetingText =
    options.eventType === 'CORPORATE'
      ? 'We cordially invite'
      : 'Together with our families, we warmly invite';
  ctx.fillText(greetingText, width / 2, currentY + 14);

  // Guest Name
  const guestDisplay = options.guestName && options.guestName.trim() ? options.guestName.trim() : 'Honored Guest';
  ctx.fillStyle = '#401526';
  ctx.font = 'bold 32px "Playfair Display", Georgia, serif';
  ctx.fillText(guestDisplay, width / 2, currentY + 54);

  // Host Attribution
  const hostDisplay = options.hostName && options.hostName !== 'Your Host' ? options.hostName : '';
  if (hostDisplay) {
    ctx.fillStyle = '#887A78';
    ctx.font = '600 11px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText(`HOSTED WITH WARMEST REGARDS BY ${hostDisplay.toUpperCase()}`, width / 2, currentY + 84);
  }

  // 9. Details Panel (Date, Time, Venue)
  const panelY = 475;
  const panelHeight = 160;
  const panelWidth = 960;
  const panelX = (width - panelWidth) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 14);
  ctx.fillStyle = 'rgba(255, 253, 252, 0.92)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(216, 182, 110, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Subtle inner panel border
  ctx.strokeStyle = 'rgba(216, 182, 110, 0.25)';
  ctx.strokeRect(panelX + 6, panelY + 6, panelWidth - 12, panelHeight - 12);
  ctx.restore();

  // Date Parsing
  const dateObj = new Date(options.eventDate);
  const weekday = isNaN(dateObj.getTime())
    ? ''
    : dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const dateFormatted = isNaN(dateObj.getTime())
    ? String(options.eventDate)
    : dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  // Column 1: Date (Center X: 320)
  const col1X = width / 2 - 280;
  ctx.fillStyle = '#B8944F';
  ctx.font = '600 11px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('DATE', col1X, panelY + 45);

  ctx.fillStyle = '#401526';
  ctx.font = '600 17px "Playfair Display", Georgia, serif';
  ctx.fillText(dateFormatted, col1X, panelY + 76);

  if (weekday) {
    ctx.fillStyle = '#887A78';
    ctx.font = '500 12px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText(weekday, col1X, panelY + 102);
  }

  // Vertical Divider 1
  ctx.strokeStyle = 'rgba(216, 182, 110, 0.35)';
  ctx.beginPath();
  ctx.moveTo(width / 2 - 130, panelY + 25);
  ctx.lineTo(width / 2 - 130, panelY + panelHeight - 25);
  ctx.stroke();

  // Column 2: Time (Center X: 600)
  const col2X = width / 2;
  ctx.fillStyle = '#B8944F';
  ctx.font = '600 11px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('TIME', col2X, panelY + 45);

  const timeDisplay = options.eventTime && options.eventTime.trim() ? options.eventTime.trim() : 'As per schedule';
  ctx.fillStyle = '#401526';
  ctx.font = '600 17px "Playfair Display", Georgia, serif';
  ctx.fillText(timeDisplay, col2X, panelY + 76);

  ctx.fillStyle = '#887A78';
  ctx.font = '500 12px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('ONWARDS', col2X, panelY + 102);

  // Vertical Divider 2
  ctx.strokeStyle = 'rgba(216, 182, 110, 0.35)';
  ctx.beginPath();
  ctx.moveTo(width / 2 + 130, panelY + 25);
  ctx.lineTo(width / 2 + 130, panelY + panelHeight - 25);
  ctx.stroke();

  // Column 3: Venue (Center X: 880)
  const col3X = width / 2 + 280;
  ctx.fillStyle = '#B8944F';
  ctx.font = '600 11px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('VENUE', col3X, panelY + 45);

  ctx.fillStyle = '#401526';
  ctx.font = '600 15px "Playfair Display", Georgia, serif';
  const venueLines = wrapText(ctx, options.venue || 'Celebration Venue', 240);
  let vY = panelY + 74;
  venueLines.slice(0, 2).forEach((vl) => {
    ctx.fillText(vl, col3X, vY);
    vY += 22;
  });

  // 10. Footer Section
  const footerY = 672;
  ctx.strokeStyle = 'rgba(216, 182, 110, 0.45)';
  ctx.beginPath();
  ctx.moveTo(width / 2 - 160, footerY);
  ctx.lineTo(width / 2 + 160, footerY);
  ctx.stroke();

  ctx.fillStyle = '#401526';
  ctx.font = '600 11px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '3.5px';
  ctx.fillText('DIGITAL INVITATION & PRIVATE RSVP', width / 2, footerY + 28);

  ctx.fillStyle = '#887A78';
  ctx.font = 'normal 12px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '0.5px';
  ctx.fillText('Open your unique personal link to view event details and RSVP.', width / 2, footerY + 48);

  ctx.fillStyle = '#B8944F';
  ctx.font = '500 9px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('INVITE STUDIO • SIGNATURE LUXURY COLLECTION', width / 2, footerY + 68);

  return canvas;
}

/**
 * Returns a high quality JPEG Data URL from the rendered luxury card.
 */
export async function generateInvitationCardDataUrl(
  options: InvitationCardOptions
): Promise<string> {
  const canvas = await renderInvitationCardCanvas(options);
  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Returns a Blob of the rendered luxury card.
 */
export async function generateInvitationCardBlob(
  options: InvitationCardOptions
): Promise<Blob> {
  const canvas = await renderInvitationCardCanvas(options);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate image blob from canvas'));
      },
      'image/jpeg',
      0.95
    );
  });
}

/**
 * Returns a File object ready for navigator.share({ files: [file] }) or download.
 */
export async function generateInvitationCardFile(
  options: InvitationCardOptions
): Promise<File> {
  const blob = await generateInvitationCardBlob(options);
  const cleanName = (options.guestName || 'Guest')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);
  const fileName = `Invitation_${cleanName}.jpg`;
  return new File([blob], fileName, { type: 'image/jpeg' });
}
