
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Atom, Search, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getPubChemId } from "@/utils/dockingUtils";

interface EnhancedLigandInputProps {
  onLigandSelected: (data: {
    type: 'single' | 'batch';
    smiles: string | string[];
    pubchemIds?: string | string[];
    names?: string | string[];
  }) => void;
}

const EnhancedLigandInput: React.FC<EnhancedLigandInputProps> = ({ onLigandSelected }) => {
  const [inputType, setInputType] = useState('single');
  const [singleSmiles, setSingleSmiles] = useState('');
  const [singleName, setSingleName] = useState('');
  const [batchSmiles, setBatchSmiles] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [singlePubchemId, setSinglePubchemId] = useState('');

  const validateSmiles = (smiles: string): boolean => {
    // Basic SMILES validation
    const basicPattern = /^[CNOSPFIBrCl\[\]()=\-+#@0-9]+$/i;
    return smiles.length > 0 && smiles.length < 1000 && basicPattern.test(smiles);
  };

  const handleSingleLigandSubmit = async () => {
    if (!singleSmiles.trim()) {
      toast({
        title: "SMILES Required",
        description: "Please enter a valid SMILES string.",
        variant: "destructive"
      });
      return;
    }

    if (!validateSmiles(singleSmiles)) {
      toast({
        title: "Invalid SMILES",
        description: "Please check your SMILES string format.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Fetch PubChem ID
      const pubchemId = await getPubChemId(singleSmiles);
      setSinglePubchemId(pubchemId || 'Not found');

      onLigandSelected({
        type: 'single',
        smiles: singleSmiles,
        pubchemIds: pubchemId || undefined,
        names: singleName || 'Ligand Compound'
      });

      toast({
        title: "Ligand Configured",
        description: `Single ligand set successfully${pubchemId ? ` (PubChem ID: ${pubchemId})` : ''}.`
      });

    } catch (error) {
      toast({
        title: "Processing Error",
        description: "Failed to process ligand information.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchLigandSubmit = async () => {
    if (!batchSmiles.trim()) {
      toast({
        title: "Batch Input Required",
        description: "Please enter SMILES strings for batch processing.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const lines = batchSmiles.split('\n').filter(line => line.trim());
      const smilesArray: string[] = [];
      const namesArray: string[] = [];
      const pubchemIds: string[] = [];

      for (const line of lines) {
        const parts = line.split('\t');
        const smiles = parts[0]?.trim();
        const name = parts[1]?.trim() || `Compound ${smilesArray.length + 1}`;

        if (smiles && validateSmiles(smiles)) {
          smilesArray.push(smiles);
          namesArray.push(name);
          
          // Fetch PubChem ID for each compound
          try {
            const pubchemId = await getPubChemId(smiles);
            pubchemIds.push(pubchemId || 'Not found');
          } catch {
            pubchemIds.push('Not found');
          }
        }
      }

      if (smilesArray.length === 0) {
        toast({
          title: "No Valid SMILES",
          description: "No valid SMILES strings found in the input.",
          variant: "destructive"
        });
        return;
      }

      onLigandSelected({
        type: 'batch',
        smiles: smilesArray,
        pubchemIds: pubchemIds,
        names: namesArray
      });

      toast({
        title: "Batch Ligands Configured",
        description: `${smilesArray.length} ligands processed successfully with PubChem ID lookup.`
      });

    } catch (error) {
      toast({
        title: "Batch Processing Error",
        description: "Failed to process batch ligand information.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-blue-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Atom className="h-5 w-5" />
          Enhanced Ligand Input with PubChem Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs value={inputType} onValueChange={setInputType} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Ligand</TabsTrigger>
            <TabsTrigger value="batch">Batch Processing</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ligand-name">Ligand Name (Optional)</Label>
                <Input
                  id="ligand-name"
                  placeholder="e.g., Aspirin, Compound X"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smiles-input">SMILES String</Label>
                <div className="flex gap-2">
                  <Input
                    id="smiles-input"
                    placeholder="e.g., CC(=O)OC1=CC=CC=C1C(=O)O"
                    value={singleSmiles}
                    onChange={(e) => setSingleSmiles(e.target.value)}
                    className="font-mono"
                  />
                  <Button size="sm" variant="outline" disabled={!singleSmiles || isProcessing}>
                    <Search className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Enter a SMILES string to automatically fetch PubChem ID and properties
                </p>
              </div>

              {singlePubchemId && (
                <Card className="p-3 bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">PubChem ID: {singlePubchemId}</Badge>
                    <Badge variant="secondary">Validated</Badge>
                  </div>
                </Card>
              )}

              <Card className="p-4 bg-green-50 border-green-200">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-800">Enhanced Features</h4>
                  <ul className="text-sm text-green-600 space-y-1">
                    <li>• Automatic PubChem ID lookup for compound identification</li>
                    <li>• SMILES validation and structure verification</li>
                    <li>• 2D and 3D structure visualization in stick format</li>
                    <li>• Molecular properties calculation</li>
                  </ul>
                </div>
              </Card>
            </div>

            <div className="text-center">
              <Button 
                onClick={handleSingleLigandSubmit}
                disabled={!singleSmiles || isProcessing}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {isProcessing ? 'Processing...' : 'Set Single Ligand'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="batch" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="batch-input">Batch SMILES Input</Label>
                <Textarea
                  id="batch-input"
                  placeholder="Enter one SMILES per line, optionally with tab-separated names:&#10;CC(=O)OC1=CC=CC=C1C(=O)O	Aspirin&#10;CC(C)CC1=CC=C(C=C1)C(C)C(=O)O	Ibuprofen&#10;CN1C=NC2=C1C(=O)N(C(=O)N2C)C	Caffeine"
                  value={batchSmiles}
                  onChange={(e) => setBatchSmiles(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  Format: SMILES[TAB]Name (one per line). Names are optional.
                </p>
              </div>

              <Card className="p-4 bg-purple-50 border-purple-200">
                <div className="flex items-start gap-3">
                  <Upload className="h-5 w-5 text-purple-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-purple-800">Batch Processing Features</h4>
                    <p className="text-sm text-purple-600 mt-1">
                      Process multiple ligands simultaneously with automatic PubChem ID lookup, 
                      SMILES validation, and comprehensive reporting for each compound.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="text-center">
              <Button 
                onClick={handleBatchLigandSubmit}
                disabled={!batchSmiles || isProcessing}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {isProcessing ? 'Processing Batch...' : 'Process Batch Ligands'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EnhancedLigandInput;
