import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { getStore, getStoreProducts } from '../../src/api/endpoints';
import { Button, Empty, ErrorView, Loading, Screen } from '../../src/components/ui';
import { useI18n } from '../../src/i18n';
import { money } from '../../src/theme/format';
import { colors, radius, spacing, text } from '../../src/theme/tokens';

export default function Store(): JSX.Element {
  const t = useI18n((state) => state.t);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const store = useQuery({
    queryKey: ['store', id],
    queryFn: () => getStore(id),
    enabled: Boolean(id),
  });
  const products = useQuery({
    queryKey: ['store', id, 'products'],
    queryFn: () => getStoreProducts(id),
    enabled: Boolean(id),
  });

  if (store.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }
  if (store.isError || !store.data) {
    return (
      <Screen>
        <ErrorView message={t.common.notFound} onRetry={() => void store.refetch()} />
      </Screen>
    );
  }

  const data = store.data;

  return (
    <Screen>
      <FlatList
        data={products.data?.items ?? []}
        keyExtractor={(product) => product.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.sm }}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.name}>{data.name}</Text>
            {data.username ? <Text style={styles.handle}>@{data.username}</Text> : null}
            <Text style={[styles.status, { color: data.isOpen ? colors.success : colors.textDim }]}>
              {data.isOpen
                ? data.closesAt
                  ? t.stores.openUntil.replace('{time}', data.closesAt)
                  : t.stores.open
                : data.opensAt
                  ? t.stores.closedOpensAt.replace('{time}', data.opensAt)
                  : t.stores.closed}
            </Text>

            <Text style={styles.address}>{data.address}</Text>
            {data.landmark ? (
              <Text style={styles.landmark}>{t.stores.landmarkLine.replace('{x}', data.landmark)}</Text>
            ) : null}

            {data.avgResponseMin !== null ? (
              <Text style={styles.response}>
                {t.stores.respondsIn.replace('{n}', String(data.avgResponseMin))}
              </Text>
            ) : null}

            <View style={styles.row}>
              <Button
                title={t.stores.call}
                variant="ghost"
                onPress={() => void Linking.openURL(`tel:${data.phone}`)}
              />
              <Button
                title={t.stores.directions}
                variant="ghost"
                onPress={() =>
                  void Linking.openURL(
                    `https://maps.google.com/?q=${data.location.lat},${data.location.lng}`,
                  )
                }
              />
            </View>

            {data.delivery.enabled ? (
              <Text style={styles.delivery}>
                {t.stores.deliveryUpTo.replace('{km}', (data.delivery.radiusM / 1000).toFixed(0))} ·{' '}
                {Number(data.delivery.fee) === 0
                  ? t.stores.deliveryFree
                  : money(data.delivery.fee, data.currency)}
                {data.delivery.freeFrom
                  ? ` · ${t.stores.freeFrom.replace('{x}', money(data.delivery.freeFrom, data.currency))}`
                  : ''}
              </Text>
            ) : (
              <Text style={styles.delivery}>{t.stores.pickupOnly}</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/product/${item.id}`)}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]} />
            )}
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.price}>{money(item.price, item.currency)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          products.isLoading ? <Loading /> : <Empty title={t.stores.noProducts} />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm },
  header: { gap: spacing.xs, marginBottom: spacing.md },
  name: { ...text.h2, color: colors.text },
  handle: { ...text.small, color: colors.accent },
  status: { ...text.small },
  address: { ...text.body, color: colors.textMuted, marginTop: spacing.xs },
  landmark: { ...text.small, color: colors.textDim },
  response: { ...text.small, color: colors.accent, marginTop: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  delivery: { ...text.small, color: colors.textDim, marginTop: spacing.sm },
  card: { flex: 1, gap: 2, marginBottom: spacing.md },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: { borderWidth: 1, borderColor: colors.border },
  cardTitle: { ...text.bodyMed, color: colors.text, marginTop: spacing.sm },
  price: { ...text.bodyMed, color: colors.text },
});
