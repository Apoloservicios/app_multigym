// src/services/firebase/paymentsService.ts (CORREGIDO)
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  limit,
  Timestamp,
  doc,
  getDoc,
  addDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from './config';

export interface PaymentRecord {
  id?: string;
  memberId: string;
  gymId: string;
  amount: number;
  concept: string;
  dueDate: Timestamp;
  paidDate?: Timestamp;
  status: 'paid' | 'pending' | 'overdue' | 'partial';
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'app';
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DebtSummary {
  totalDebt: number;
  overdueAmount: number;
  pendingAmount: number;
  nextDueDate: Date | null;
  paymentsThisMonth: number;
  lastPaymentDate: Date | null;
  lastPaymentAmount: number;
}

export interface PaymentPlan {
  id?: string;
  memberId: string;
  planType: string;
  monthlyAmount: number;
  startDate: Timestamp;
  endDate?: Timestamp;
  isActive: boolean;
}

export const paymentsService = {
  // Obtener resumen de deudas del miembro (SIMPLIFICADO)
  getDebtSummary: async (memberId: string): Promise<DebtSummary> => {
    try {
      console.log('💰 Obteniendo resumen de deudas (modo simplificado)...');
      
      // Intentar solo ubicaciones que sabemos que funcionan
      const paymentLocations = [
        { ref: collection(db, 'subscriptionPayments'), needsFilter: true }
      ];

      let payments: PaymentRecord[] = [];

      for (const location of paymentLocations) {
        try {
          let q;
          
          if (location.needsFilter) {
            // Query simple sin orderBy para evitar índices
            q = query(
              location.ref,
              where('memberId', '==', memberId),
              limit(50)
            );
          } else {
            q = query(location.ref, limit(50));
          }

          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              payments.push({
                id: doc.id,
                memberId: data.memberId || memberId,
                gymId: data.gymId || '',
                amount: data.amount || 0,
                concept: data.concept || 'Pago de membresía',
                dueDate: data.dueDate || data.date || Timestamp.now(),
                paidDate: data.paidDate,
                status: data.status || 'pending',
                paymentMethod: data.paymentMethod,
                notes: data.notes,
                createdAt: data.createdAt || Timestamp.now(),
                updatedAt: data.updatedAt || Timestamp.now()
              });
            });
            
            console.log(`✅ ${payments.length} pagos encontrados en: ${location.ref.path}`);
            break; // Salir si encontramos datos
          }
        } catch (error) {
          console.log(`⚠️ Error en ${location.ref.path}:`, error);
          continue;
        }
      }

      // Calcular totales en JavaScript
      const now = new Date();
      let totalDebt = 0;
      let overdueAmount = 0;
      let pendingAmount = 0;
      let nextDueDate: Date | null = null;
      let paymentsThisMonth = 0;
      let lastPaymentDate: Date | null = null;
      let lastPaymentAmount = 0;

      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Ordenar pagos por fecha manualmente
      payments.sort((a, b) => b.dueDate.toMillis() - a.dueDate.toMillis());

      payments.forEach(payment => {
        const dueDate = payment.dueDate.toDate();
        const paidDate = payment.paidDate?.toDate();

        if (payment.status === 'pending' || payment.status === 'overdue') {
          totalDebt += payment.amount;
          
          if (dueDate < now) {
            overdueAmount += payment.amount;
          } else {
            pendingAmount += payment.amount;
            
            if (!nextDueDate || dueDate < nextDueDate) {
              nextDueDate = dueDate;
            }
          }
        }

        if (payment.status === 'paid' && paidDate && paidDate >= thisMonthStart) {
          paymentsThisMonth += payment.amount;
        }

        if (payment.status === 'paid' && paidDate) {
          if (!lastPaymentDate || paidDate > lastPaymentDate) {
            lastPaymentDate = paidDate;
            lastPaymentAmount = payment.amount;
          }
        }
      });

      const summary: DebtSummary = {
        totalDebt,
        overdueAmount,
        pendingAmount,
        nextDueDate,
        paymentsThisMonth,
        lastPaymentDate,
        lastPaymentAmount
      };

      console.log('✅ Resumen de deudas obtenido:', summary);
      return summary;

    } catch (error) {
      console.error('❌ Error obteniendo resumen de deudas:', error);
      return {
        totalDebt: 0,
        overdueAmount: 0,
        pendingAmount: 0,
        nextDueDate: null,
        paymentsThisMonth: 0,
        lastPaymentDate: null,
        lastPaymentAmount: 0
      };
    }
  },

  // Obtener historial de pagos (SIMPLIFICADO)
  getPaymentHistory: async (memberId: string, limitCount: number = 20): Promise<PaymentRecord[]> => {
    try {
      console.log('📋 Obteniendo historial de pagos (modo simplificado)...');
      
      const paymentsRef = collection(db, 'subscriptionPayments');
      const q = query(
        paymentsRef,
        where('memberId', '==', memberId),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const payments: PaymentRecord[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        payments.push({
          id: doc.id,
          memberId: data.memberId || memberId,
          gymId: data.gymId || '',
          amount: data.amount || 0,
          concept: data.concept || 'Pago de membresía',
          dueDate: data.dueDate || data.date || Timestamp.now(),
          paidDate: data.paidDate,
          status: data.status || 'pending',
          paymentMethod: data.paymentMethod,
          notes: data.notes,
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: data.updatedAt || Timestamp.now()
        });
      });

      // Ordenar manualmente por fecha
      payments.sort((a, b) => b.dueDate.toMillis() - a.dueDate.toMillis());

      console.log(`✅ ${payments.length} pagos obtenidos`);
      return payments;

    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      return [];
    }
  },

  // Obtener pagos pendientes (SIMPLIFICADO)
  getPendingPayments: async (memberId: string): Promise<PaymentRecord[]> => {
    try {
      console.log('⏰ Obteniendo pagos pendientes (modo simplificado)...');
      
      // Obtener todos los pagos y filtrar en JavaScript
      const allPayments = await paymentsService.getPaymentHistory(memberId, 50);
      
      const pendingPayments = allPayments
        .filter(payment => payment.status === 'pending' || payment.status === 'overdue')
        .sort((a, b) => a.dueDate.toMillis() - b.dueDate.toMillis());

      console.log(`✅ ${pendingPayments.length} pagos pendientes`);
      return pendingPayments;

    } catch (error) {
      console.error('❌ Error obteniendo pagos pendientes:', error);
      return [];
    }
  },

  // Registrar un pago (para notificar al gimnasio)
  registerPaymentNotification: async (
    memberId: string,
    gymId: string,
    amount: number,
    paymentMethod: string,
    concept: string,
    notes?: string
  ): Promise<string> => {
    try {
      console.log('💳 Registrando notificación de pago...');
      
      const paymentNotification = {
        memberId,
        gymId,
        amount,
        paymentMethod,
        concept,
        notes: notes || '',
        status: 'pending_verification',
        notificationDate: Timestamp.fromDate(new Date()),
        verified: false,
        createdAt: Timestamp.fromDate(new Date())
      };

      const notificationsRef = collection(db, 'paymentNotifications');
      const docRef = await addDoc(notificationsRef, paymentNotification);

      console.log('✅ Notificación de pago registrada');
      return docRef.id;

    } catch (error) {
      console.error('❌ Error registrando notificación:', error);
      throw error;
    }
  },

  // Obtener plan de pagos activo (SIMPLIFICADO)
  getActivePlan: async (memberId: string): Promise<PaymentPlan | null> => {
    try {
      console.log('📋 Obteniendo plan de pagos activo (modo simplificado)...');
      
      // Intentar diferentes ubicaciones
      const planLocations = [
        collection(db, 'subscriptionPlans'),
        collection(db, 'membershipAssignments')
      ];

      for (const plansRef of planLocations) {
        try {
          const q = query(
            plansRef,
            where('memberId', '==', memberId),
            limit(5)
          );

          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Buscar uno activo
            for (const doc of querySnapshot.docs) {
              const data = doc.data();
              
              if (data.isActive === true || data.status === 'active') {
                const plan: PaymentPlan = {
                  id: doc.id,
                  memberId: data.memberId || memberId,
                  planType: data.planType || data.activityName || 'Plan Básico',
                  monthlyAmount: data.monthlyAmount || data.cost || 0,
                  startDate: data.startDate || Timestamp.now(),
                  endDate: data.endDate,
                  isActive: true
                };

                console.log('✅ Plan activo encontrado:', plan.planType);
                return plan;
              }
            }
          }
        } catch (error) {
          console.log(`⚠️ Error en ${plansRef.path}:`, error);
          continue;
        }
      }

      console.log('ℹ️ No se encontró plan activo');
      return null;

    } catch (error) {
      console.error('❌ Error obteniendo plan:', error);
      return null;
    }
  },

  // Simular pago con tarjeta/transferencia
  simulatePayment: async (
    paymentId: string,
    amount: number,
    paymentMethod: 'card' | 'transfer'
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> => {
    try {
      console.log('💳 Simulando pago...');
      
      // Simular delay de procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simular 90% de éxito
      const success = Math.random() > 0.1;
      
      if (success) {
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('✅ Pago simulado exitoso:', transactionId);
        return {
          success: true,
          transactionId
        };
      } else {
        console.log('❌ Pago simulado falló');
        return {
          success: false,
          error: 'Error de procesamiento. Intenta nuevamente.'
        };
      }

    } catch (error) {
      console.error('❌ Error en simulación:', error);
      return {
        success: false,
        error: 'Error técnico. Contacta al soporte.'
      };
    }
  },

  // Obtener métodos de pago disponibles
  getAvailablePaymentMethods: () => {
    return [
      {
        id: 'cash',
        name: 'Efectivo',
        description: 'Pago en el gimnasio',
        icon: 'cash',
        available: true
      },
      {
        id: 'card',
        name: 'Tarjeta de Débito/Crédito',
        description: 'Pago con tarjeta',
        icon: 'card',
        available: false // Funcionalidad futura
      },
      {
        id: 'transfer',
        name: 'Transferencia Bancaria',
        description: 'Transferir a cuenta del gimnasio',
        icon: 'business',
        available: true
      },
      {
        id: 'app',
        name: 'Billetera Digital',
        description: 'MercadoPago, Ualá, etc.',
        icon: 'phone-portrait',
        available: false // Funcionalidad futura
      }
    ];
  },

  // Formatear moneda argentina
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  // Calcular días hasta vencimiento
  getDaysUntilDue: (dueDate: Date): number => {
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  },

  // Obtener estado del pago basado en fecha de vencimiento
  getPaymentStatus: (payment: PaymentRecord): {
    status: 'paid' | 'pending' | 'overdue' | 'due_soon';
    daysUntilDue: number;
    urgency: 'low' | 'medium' | 'high';
  } => {
    if (payment.status === 'paid') {
      return {
        status: 'paid',
        daysUntilDue: 0,
        urgency: 'low'
      };
    }

    const daysUntilDue = paymentsService.getDaysUntilDue(payment.dueDate.toDate());
    
    if (daysUntilDue < 0) {
      return {
        status: 'overdue',
        daysUntilDue,
        urgency: 'high'
      };
    } else if (daysUntilDue <= 3) {
      return {
        status: 'due_soon',
        daysUntilDue,
        urgency: 'high'
      };
    } else if (daysUntilDue <= 7) {
      return {
        status: 'pending',
        daysUntilDue,
        urgency: 'medium'
      };
    } else {
      return {
        status: 'pending',
        daysUntilDue,
        urgency: 'low'
      };
    }
  }
};