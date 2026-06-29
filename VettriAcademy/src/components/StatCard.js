const styles = StyleSheet.create({
  card: {
    width: '48%',
    height: 170,
    borderRadius: 24,
    padding: 20,
    justifyContent: 'space-between',
    marginHorizontal: '1%',
    marginVertical: 10,

    shadowColor: '#11C5C6',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 8,
  },

  label: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    opacity: 0.95,
  },

  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  icon: {
    fontSize: 34,
    marginRight: 10,
  },

  amount: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: '900',
  },

  change: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '600',
  },
});