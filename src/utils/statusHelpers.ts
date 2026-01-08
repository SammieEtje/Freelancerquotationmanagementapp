// Gedeelde status helper functies voor offertes

export type QuotationStatus = 'draft' | 'sent' | 'accepted';

export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'draft': return 'Concept';
    case 'sent': return 'Verstuurd';
    case 'accepted': return 'Geaccepteerd';
    default: return status;
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-800';
    case 'sent': return 'bg-blue-100 text-blue-800';
    case 'accepted': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
