const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',

    borderRadius: 20,

    paddingVertical: 18,
    paddingHorizontal: 18,

    marginHorizontal: 16,
    marginVertical: 8,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 5,
  },

  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  icon: {
    fontSize: 34,
    marginRight: 16,
  },

  textContainer: {
    flex: 1,
  },

  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#24324A',
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 14,
    color: '#64748B',
  },

  metadata: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 3,
  },

  actions: {
    flexDirection: 'row',
    gap: 8,
  },

  actionButton: {
    width: 42,
    height: 42,

    borderRadius: 12,

    backgroundColor: '#FFF4F7',

    justifyContent: 'center',
    alignItems: 'center',
  },

  actionIcon: {
    fontSize: 20,
  },
});