// src/screens/main/PaymentsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { 
  paymentsService, 
  PaymentRecord, 
  DebtSummary, 
  PaymentPlan 
} from '../../services/firebase/paymentsService';

export const PaymentsScreen: React.FC = () => {
  const { memberInfo, gymInfo } = useAuth();
  const [debtSummary, setDebtSummary] = useState<DebtSummary | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PaymentRecord[]>([]);
  const [activePlan, setActivePlan] = useState<PaymentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const loadPaymentData = async () => {
    try {
      if (!memberInfo) return;

      console.log('💰 Cargando datos de pagos...');

      const [summary, history, pending, plan] = await Promise.all([
        paymentsService.getDebtSummary(memberInfo.id),
        paymentsService.getPaymentHistory(memberInfo.id, 15),
        paymentsService.getPendingPayments(memberInfo.id),
        paymentsService.getActivePlan(memberInfo.id)
      ]);

      setDebtSummary(summary);
      setPaymentHistory(history);
      setPendingPayments(pending);
      setActivePlan(plan);

      console.log('✅ Datos de pagos cargados');

    } catch (error) {
      console.error('❌ Error cargando pagos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos de pagos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPaymentData();
  }, [memberInfo]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPaymentData();
  };

  const handlePaymentPress = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setPaymentMethod('');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPayment || !paymentMethod || !memberInfo || !gymInfo) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setPaymentLoading(true);
    try {
      // Registrar notificación de pago
      await paymentsService.registerPaymentNotification(
        memberInfo.id,
        gymInfo.id,
        selectedPayment.amount,
        paymentMethod,
        selectedPayment.concept,
        paymentNotes
      );

      Alert.alert(
        '✅ Pago Registrado',
        `Tu pago de ${paymentsService.formatCurrency(selectedPayment.amount)} ha sido registrado.\n\nEl gimnasio verificará tu pago y actualizará tu estado.`,
        [
          { 
            text: 'Entendido', 
            onPress: () => {
              setShowPaymentModal(false);
              loadPaymentData();
            }
          }
        ]
      );

    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar el pago. Intenta nuevamente.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#28a745';
      case 'pending': return '#ffc107';
      case 'overdue': return '#dc3545';
      case 'due_soon': return '#fd7e14';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Pagado';
      case 'pending': return 'Pendiente';
      case 'overdue': return 'Vencido';
      case 'due_soon': return 'Por vencer';
      default: return status;
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'warning';
      case 'medium': return 'time';
      case 'low': return 'checkmark-circle';
      default: return 'information-circle';
    }
  };

  const formatDate = (timestamp: any): string => {
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const paymentMethods = paymentsService.getAvailablePaymentMethods();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Cargando información de pagos...</Text>
      </View>
    );
  }

  if (!memberInfo || !gymInfo) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error al cargar datos</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💳 Pagos y Estado de Cuenta</Text>
        <Text style={styles.headerSubtitle}>{gymInfo.name}</Text>
      </View>

      {/* Resumen de Deudas */}
      {debtSummary && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>💰 Resumen Financiero</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total adeudado:</Text>
            <Text style={[styles.summaryValue, {
              color: debtSummary.totalDebt > 0 ? '#dc3545' : '#28a745'
            }]}>
              {paymentsService.formatCurrency(debtSummary.totalDebt)}
            </Text>
          </View>

          {debtSummary.overdueAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Vencido:</Text>
              <Text style={[styles.summaryValue, { color: '#dc3545' }]}>
                {paymentsService.formatCurrency(debtSummary.overdueAmount)}
              </Text>
            </View>
          )}

          {debtSummary.pendingAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pendiente:</Text>
              <Text style={[styles.summaryValue, { color: '#ffc107' }]}>
                {paymentsService.formatCurrency(debtSummary.pendingAmount)}
              </Text>
            </View>
          )}

          {debtSummary.nextDueDate && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Próximo vencimiento:</Text>
              <Text style={styles.summaryValue}>
                {debtSummary.nextDueDate.toLocaleDateString('es-ES')}
              </Text>
            </View>
          )}

          {debtSummary.lastPaymentDate && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Último pago:</Text>
              <Text style={styles.summaryValue}>
                {paymentsService.formatCurrency(debtSummary.lastPaymentAmount)} - {debtSummary.lastPaymentDate.toLocaleDateString('es-ES')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Plan Activo */}
      {activePlan && (
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <Ionicons name="card" size={24} color="#007bff" />
            <Text style={styles.planTitle}>Mi Plan Actual</Text>
          </View>
          <Text style={styles.planType}>{activePlan.planType}</Text>
          <Text style={styles.planAmount}>
            {paymentsService.formatCurrency(activePlan.monthlyAmount)}/mes
          </Text>
          <Text style={styles.planDates}>
            Desde: {formatDate(activePlan.startDate)}
          </Text>
        </View>
      )}

      {/* Pagos Pendientes */}
      {pendingPayments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ Pagos Pendientes</Text>
          
          {pendingPayments.map((payment, index) => {
            const paymentStatus = paymentsService.getPaymentStatus(payment);
            
            return (
              <TouchableOpacity
                key={payment.id || index}
                style={[styles.paymentItem, {
                  borderLeftColor: getStatusColor(paymentStatus.status),
                  borderLeftWidth: 4
                }]}
                onPress={() => handlePaymentPress(payment)}
              >
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentConcept}>{payment.concept}</Text>
                    <Text style={styles.paymentAmount}>
                      {paymentsService.formatCurrency(payment.amount)}
                    </Text>
                  </View>
                  
                  <View style={styles.paymentStatus}>
                    <Ionicons 
                      name={getUrgencyIcon(paymentStatus.urgency)} 
                      size={20} 
                      color={getStatusColor(paymentStatus.status)} 
                    />
                    <Text style={[styles.statusText, {
                      color: getStatusColor(paymentStatus.status)
                    }]}>
                      {getStatusText(paymentStatus.status)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentDate}>
                    Vence: {formatDate(payment.dueDate)}
                  </Text>
                  {paymentStatus.daysUntilDue < 0 ? (
                    <Text style={styles.overdueDays}>
                      Vencido hace {Math.abs(paymentStatus.daysUntilDue)} días
                    </Text>
                  ) : (
                    <Text style={styles.dueDays}>
                      {paymentStatus.daysUntilDue === 0 ? 'Vence hoy' : 
                       paymentStatus.daysUntilDue === 1 ? 'Vence mañana' :
                       `Vence en ${paymentStatus.daysUntilDue} días`}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Historial de Pagos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Historial de Pagos</Text>
        
        {paymentHistory.length > 0 ? (
          paymentHistory.map((payment, index) => (
            <View key={payment.id || index} style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyConcept}>{payment.concept}</Text>
                <Text style={[styles.historyAmount, {
                  color: payment.status === 'paid' ? '#28a745' : '#6c757d'
                }]}>
                  {paymentsService.formatCurrency(payment.amount)}
                </Text>
              </View>
              
              <View style={styles.historyDetails}>
                <Text style={styles.historyDate}>
                  {payment.status === 'paid' && payment.paidDate ? 
                    `Pagado: ${formatDate(payment.paidDate)}` :
                    `Vence: ${formatDate(payment.dueDate)}`
                  }
                </Text>
                
                <View style={[styles.historyStatus, {
                  backgroundColor: getStatusColor(payment.status)
                }]}>
                  <Text style={styles.historyStatusText}>
                    {getStatusText(payment.status)}
                  </Text>
                </View>
              </View>
              
              {payment.paymentMethod && (
                <Text style={styles.paymentMethodText}>
                  Método: {payment.paymentMethod}
                </Text>
              )}
            </View>
          ))
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="receipt-outline" size={48} color="#6c757d" />
            <Text style={styles.noDataText}>Sin historial de pagos</Text>
          </View>
        )}
      </View>

      {/* Modal de Pago */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>💳 Registrar Pago</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <Ionicons name="close" size={24} color="#6c757d" />
            </TouchableOpacity>
          </View>
          
          {selectedPayment && (
            <ScrollView style={styles.modalContent}>
              {/* Detalles del Pago */}
              <View style={styles.paymentDetailCard}>
                <Text style={styles.paymentDetailTitle}>Detalles del Pago</Text>
                <Text style={styles.paymentDetailConcept}>{selectedPayment.concept}</Text>
                <Text style={styles.paymentDetailAmount}>
                  {paymentsService.formatCurrency(selectedPayment.amount)}
                </Text>
                <Text style={styles.paymentDetailDate}>
                  Vence: {formatDate(selectedPayment.dueDate)}
                </Text>
              </View>

              {/* Métodos de Pago */}
              <View style={styles.paymentMethodSection}>
                <Text style={styles.paymentMethodTitle}>Método de Pago</Text>
                
                {paymentMethods.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.paymentMethodOption,
                      paymentMethod === method.id && styles.selectedPaymentMethod,
                      !method.available && styles.disabledPaymentMethod
                    ]}
                    onPress={() => method.available && setPaymentMethod(method.id)}
                    disabled={!method.available}
                  >
                    <Ionicons 
                      name={method.icon as any} 
                      size={24} 
                      color={!method.available ? '#6c757d' : 
                             paymentMethod === method.id ? '#007bff' : '#212529'} 
                    />
                    <View style={styles.paymentMethodInfo}>
                      <Text style={[
                        styles.paymentMethodName,
                        !method.available && styles.disabledText
                      ]}>
                        {method.name}
                      </Text>
                      <Text style={[
                        styles.paymentMethodDescription,
                        !method.available && styles.disabledText
                      ]}>
                        {method.description}
                        {!method.available && ' (Próximamente)'}
                      </Text>
                    </View>
                    {paymentMethod === method.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#007bff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notas */}
              <View style={styles.notesSection}>
                <Text style={styles.notesTitle}>Notas (Opcional)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Agrega detalles sobre tu pago..."
                  value={paymentNotes}
                  onChangeText={setPaymentNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Información Importante */}
              <View style={styles.infoSection}>
                <Ionicons name="information-circle" size={20} color="#007bff" />
                <Text style={styles.infoText}>
                  Al registrar este pago, notificarás al gimnasio. 
                  Ellos verificarán tu pago y actualizarán tu estado de cuenta.
                </Text>
              </View>

              {/* Botones de Acción */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowPaymentModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!paymentMethod || paymentLoading) && styles.disabledButton
                  ]}
                  onPress={handlePaymentSubmit}
                  disabled={!paymentMethod || paymentLoading}
                >
                  {paymentLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Registrar Pago</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 10,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#007bff',
    padding: 20,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: -15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 15,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  planCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 15,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginLeft: 10,
  },
  planType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 5,
  },
  planAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 5,
  },
  planDates: {
    fontSize: 14,
    color: '#6c757d',
  },
  section: {
    marginHorizontal: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 15,
  },
  paymentItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentConcept: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 2,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
  },
  paymentStatus: {
    alignItems: 'center',
    gap: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentDate: {
    fontSize: 14,
    color: '#6c757d',
  },
  dueDays: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  overdueDays: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: 'bold',
  },
  historyItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyConcept: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    flex: 1,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  historyDate: {
    fontSize: 14,
    color: '#6c757d',
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  noDataContainer: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noDataText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 15,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  paymentDetailCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  paymentDetailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 10,
  },
  paymentDetailConcept: {
    fontSize: 18,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 5,
  },
  paymentDetailAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 5,
  },
  paymentDetailDate: {
    fontSize: 14,
    color: '#6c757d',
  },
  paymentMethodSection: {
    marginBottom: 20,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 15,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPaymentMethod: {
    borderColor: '#007bff',
    backgroundColor: '#e7f3ff',
  },
  disabledPaymentMethod: {
    opacity: 0.6,
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 15,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 2,
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  disabledText: {
    color: '#6c757d',
  },
  notesSection: {
    marginBottom: 20,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 10,
  },
  notesInput: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoSection: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#e7f3ff',
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#007bff',
    marginLeft: 10,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6c757d',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007bff',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 30,
  },
});