export const generateWhatsAppLink = (dealData) => {
  const { product, qty, price, parties } = dealData;
  const message = `*New Sauda Deal Alert on Pravisti*%0A%0A` +
    `*Product:* ${product}%0A` +
    `*Quantity:* ${qty}%0A` +
    `*Price:* ${price}%0A` +
    `*Parties:* ${parties}%0A%0A` +
    `Detailed breakdown is available on the Pravisti app. Click the link below to view and accept the deal:%0A` +
    `https://pravisti.app/deal/view?id=${Math.random().toString(36).substr(2, 9)}%0A%0A` +
    `_Download Pravisti:_ https://play.google.com/store/apps/details?id=com.pravisti`;

  return `whatsapp://send?text=${message}`;
};

export const shareToWhatsApp = (dealData) => {
  const url = generateWhatsAppLink(dealData);
  // In a real RN app, we would use Linking.openURL(url)
  console.log('Opening WhatsApp with URL:', url);
  return url;
};
